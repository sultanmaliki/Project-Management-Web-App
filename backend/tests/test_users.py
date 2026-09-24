import pytest

from app.models import UserRole
from tests.conftest import PASSWORD

NEW_USER = {"name": "Grace Hopper", "email": "grace@example.com", "password": "cobol-compiler", "role": "manager"}


def test_only_admin_can_create_users(client, admin, manager, dev):
    assert client.post("/api/users", json=NEW_USER, headers=dev.headers).status_code == 403
    assert client.post("/api/users", json=NEW_USER, headers=manager.headers).status_code == 403
    assert client.post("/api/users", json=NEW_USER).status_code == 401
    r = client.post("/api/users", json=NEW_USER, headers=admin.headers)
    assert r.status_code == 201 and r.json()["role"] == "manager"
    assert "password" not in r.json()


def test_created_user_can_log_in_with_the_given_password(client, admin):
    client.post("/api/users", json=NEW_USER, headers=admin.headers)
    r = client.post("/api/auth/login", json={"email": "grace@example.com", "password": "cobol-compiler"})
    assert r.status_code == 200 and r.json()["user"]["role"] == "manager"


def test_create_user_rejects_duplicates_and_bad_input(client, admin):
    assert client.post("/api/users", json=NEW_USER, headers=admin.headers).status_code == 201
    assert client.post("/api/users", json=NEW_USER, headers=admin.headers).status_code == 409
    for bad in ({"role": "superuser"}, {"password": "short"}, {"email": "nope"}):
        assert (
            client.post(
                "/api/users", json={**NEW_USER, "email": "x@example.com", **bad}, headers=admin.headers
            ).status_code
            == 422
        )


def test_list_users_is_limited_to_admins_and_managers(client, admin, manager, dev):
    assert client.get("/api/users", headers=dev.headers).status_code == 403
    for actor in (admin, manager):
        r = client.get("/api/users", headers=actor.headers)
        assert r.status_code == 200 and len(r.json()) == 3
        assert all("hashed_password" not in u for u in r.json())


def test_list_users_reports_workload(client, admin, dev, make_project, make_task):
    p1, p2 = make_project(admin, "One"), make_project(admin, "Two")
    make_task(p1, dev), make_task(p1, dev), make_task(p2, dev), make_task(p2)
    row = next(u for u in client.get("/api/users", headers=admin.headers).json() if u["id"] == dev.id)
    assert (row["task_count"], row["project_count"]) == (3, 2)
    admin_row = next(u for u in client.get("/api/users", headers=admin.headers).json() if u["id"] == admin.id)
    assert (admin_row["task_count"], admin_row["project_count"]) == (0, 0)


def test_list_users_pagination(client, admin, make_user):
    for _ in range(4):
        make_user()
    assert len(client.get("/api/users?limit=2", headers=admin.headers).json()) == 2
    assert len(client.get("/api/users?limit=10&offset=3", headers=admin.headers).json()) == 2
    assert client.get("/api/users?limit=0", headers=admin.headers).status_code == 422
    assert client.get("/api/users?limit=501", headers=admin.headers).status_code == 422


def test_get_user(client, admin, manager, dev):
    assert client.get(f"/api/users/{dev.id}", headers=admin.headers).json()["email"] == dev.email
    assert client.get("/api/users/9999", headers=admin.headers).status_code == 404
    assert client.get(f"/api/users/{dev.id}", headers=manager.headers).status_code == 403


def test_update_user_fields(client, admin, dev):
    r = client.patch(
        f"/api/users/{dev.id}",
        headers=admin.headers,
        json={"name": "Renamed", "role": "manager", "email": "New@Example.com"},
    )
    assert r.status_code == 200
    assert (r.json()["name"], r.json()["role"], r.json()["email"]) == ("Renamed", "manager", "new@example.com")


def test_admin_can_reset_a_users_password(client, admin, dev):
    assert (
        client.patch(f"/api/users/{dev.id}", headers=admin.headers, json={"password": "reset-by-admin-1"}).status_code
        == 200
    )
    assert client.post("/api/auth/login", json={"email": dev.email, "password": PASSWORD}).status_code == 401
    assert client.post("/api/auth/login", json={"email": dev.email, "password": "reset-by-admin-1"}).status_code == 200


def test_update_user_validation_and_conflicts(client, admin, dev, manager):
    assert client.patch(f"/api/users/{dev.id}", headers=admin.headers, json={"email": manager.email}).status_code == 409
    for bad in (
        {"name": None},
        {"role": None},
        {"email": None},
        {"is_active": None},
        {"role": "root"},
        {"password": "tiny"},
    ):
        assert client.patch(f"/api/users/{dev.id}", headers=admin.headers, json=bad).status_code == 422, bad
    assert client.patch("/api/users/9999", headers=admin.headers, json={"name": "x"}).status_code == 404


def test_non_admins_cannot_update_or_delete_users(client, manager, dev):
    assert client.patch(f"/api/users/{dev.id}", headers=manager.headers, json={"name": "x"}).status_code == 403
    assert client.delete(f"/api/users/{dev.id}", headers=manager.headers).status_code == 403
    assert client.patch(f"/api/users/{dev.id}", headers=dev.headers, json={"role": "admin"}).status_code == 403


def test_deactivating_a_user_locks_them_out(client, admin, dev):
    assert client.patch(f"/api/users/{dev.id}", headers=admin.headers, json={"is_active": False}).status_code == 200
    assert client.get("/api/auth/me", headers=dev.headers).status_code == 401
    assert client.post("/api/auth/login", json={"email": dev.email, "password": PASSWORD}).status_code == 401


def test_cannot_remove_the_last_admin(client, admin, make_user):
    other = make_user(UserRole.admin)
    # With two admins, one can be demoted...
    assert client.patch(f"/api/users/{other.id}", headers=admin.headers, json={"role": "developer"}).status_code == 200
    # ...but now `admin` is the only one left.
    only = client.patch(f"/api/users/{admin.id}", headers=admin.headers, json={"role": "manager"})
    assert only.status_code == 409 and "administrator" in only.json()["detail"]
    assert client.patch(f"/api/users/{admin.id}", headers=admin.headers, json={"is_active": False}).status_code == 409
    assert client.delete(f"/api/users/{admin.id}", headers=admin.headers).status_code == 409


def test_admin_cannot_demote_or_delete_themselves_even_with_other_admins(client, admin, make_user):
    make_user(UserRole.admin)
    assert client.patch(f"/api/users/{admin.id}", headers=admin.headers, json={"role": "developer"}).status_code == 409
    assert client.patch(f"/api/users/{admin.id}", headers=admin.headers, json={"is_active": False}).status_code == 409
    assert client.delete(f"/api/users/{admin.id}", headers=admin.headers).status_code == 409
    # renaming themselves is fine
    assert client.patch(f"/api/users/{admin.id}", headers=admin.headers, json={"name": "Boss"}).status_code == 200


def test_deleting_a_user_unassigns_their_tasks_and_keeps_projects(client, admin, manager, dev, make_project, make_task):
    project = make_project(manager)
    task = make_task(project, dev)
    assert client.delete(f"/api/users/{dev.id}", headers=admin.headers).status_code == 204
    assert client.get(f"/api/users/{dev.id}", headers=admin.headers).status_code == 404
    t = client.get(f"/api/tasks/{task}", headers=admin.headers).json()
    assert t["assignee"] is None
    # deleting the project owner keeps their projects
    assert client.delete(f"/api/users/{manager.id}", headers=admin.headers).status_code == 204
    p = client.get(f"/api/projects/{project}", headers=admin.headers).json()
    assert p["owner_id"] is None and len(p["tasks"]) == 1


@pytest.mark.parametrize("uid", ["abc", "1.5"])
def test_user_id_must_be_an_integer(client, admin, uid):
    assert client.get(f"/api/users/{uid}", headers=admin.headers).status_code == 422


@pytest.mark.parametrize("path", ["/api/users/{}", "/api/projects/{}", "/api/tasks/{}"])
@pytest.mark.parametrize("bad_id", ["0", "-1", "2147483648", "99999999999999999999999"])
def test_out_of_range_ids_are_rejected_not_a_500(client, admin, path, bad_id):
    assert client.get(path.format(bad_id), headers=admin.headers).status_code == 422


def test_out_of_range_assignee_id_is_rejected_not_a_500(client, manager, make_project):
    pid = make_project(manager)
    for bad in (0, -5, 2**31, 2**70):
        r = client.post(f"/api/projects/{pid}/tasks", headers=manager.headers, json={"title": "x", "assignee_id": bad})
        assert r.status_code == 422, bad
