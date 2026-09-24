import pytest


def create(client, actor, **body):
    return client.post("/api/projects", headers=actor.headers, json={"title": "Apollo", **body})


def test_create_project_permissions(client, admin, manager, dev):
    assert create(client, dev).status_code == 403
    assert client.post("/api/projects", json={"title": "x"}).status_code == 401
    for actor in (admin, manager):
        r = create(client, actor, description="Moon shot")
        assert r.status_code == 201
        body = r.json()
        assert body["owner_id"] == actor.id and body["task_count"] == 0 and body["progress"] == 0


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"title": ""},
        {"title": "   "},
        {"title": "t" * 151},
        {"title": "ok", "description": "d" * 2001},
        {"title": None},
    ],
)
def test_create_project_validation(client, manager, body):
    assert client.post("/api/projects", headers=manager.headers, json=body).status_code == 422


def test_project_text_is_stored_verbatim_and_trimmed(client, manager):
    payload = "<script>alert(1)</script> Robert'); DROP TABLE projects;--"
    r = create(client, manager, title=f"  {payload}  ", description="  hi  ")
    assert r.status_code == 201
    assert r.json()["title"] == payload and r.json()["description"] == "hi"
    assert client.get("/api/projects", headers=manager.headers).status_code == 200  # table survived


def test_blank_description_is_stored_as_null(client, manager):
    assert create(client, manager, description="   ").json()["description"] is None


def test_managers_and_admins_see_all_projects(client, admin, manager, dev, make_project):
    make_project(admin, "A"), make_project(None, "B")
    for actor in (admin, manager):
        assert len(client.get("/api/projects", headers=actor.headers).json()) == 2
    assert client.get("/api/projects", headers=dev.headers).json() == []


def test_developers_only_see_projects_they_have_tasks_in(client, dev, make_user, make_project, make_task):
    other = make_user()
    mine, theirs, empty = make_project(None, "mine"), make_project(None, "theirs"), make_project(None, "empty")
    make_task(mine, dev), make_task(mine, other), make_task(theirs, other)
    listed = client.get("/api/projects", headers=dev.headers).json()
    assert [p["id"] for p in listed] == [mine]
    assert client.get(f"/api/projects/{mine}", headers=dev.headers).status_code == 200
    # hidden projects look exactly like missing ones
    for pid in (theirs, empty, 9999):
        assert client.get(f"/api/projects/{pid}", headers=dev.headers).status_code == 404


def test_project_detail_has_tasks_team_and_progress(client, manager, make_user, make_project, make_task):
    a, b = make_user(name="Zed"), make_user(name="Amy")
    pid = make_project(manager)
    make_task(pid, a, status="done"), make_task(pid, b, status="todo"), make_task(pid, a, status="in-progress")
    make_task(pid, None, status="done")
    body = client.get(f"/api/projects/{pid}", headers=manager.headers).json()
    assert (body["task_count"], body["done_count"], body["progress"]) == (4, 2, 50)
    assert [m["name"] for m in body["team"]] == ["Amy", "Zed"]  # unique, sorted
    assert len(body["tasks"]) == 4 and body["tasks"][0]["assignee"]["name"] == "Zed"
    assert "email" not in body["tasks"][0]["assignee"]


def test_progress_rounding(client, manager, make_project, make_task):
    pid = make_project(manager)
    make_task(pid, status="done"), make_task(pid, status="todo"), make_task(pid, status="todo")
    assert client.get(f"/api/projects/{pid}", headers=manager.headers).json()["progress"] == 33


def test_get_missing_project(client, manager):
    assert client.get("/api/projects/9999", headers=manager.headers).status_code == 404


def test_search_and_wildcards_are_literal(client, manager, make_project):
    for title in ("Alpha site", "alpha API", "Beta", "100% done", "a_b"):
        make_project(None, title)
    titles = lambda q: sorted(
        p["title"] for p in client.get("/api/projects", params={"q": q}, headers=manager.headers).json()
    )  # noqa: E731
    assert titles("ALPHA") == ["Alpha site", "alpha API"]
    assert titles("%") == ["100% done"]  # % is not a wildcard
    assert titles("_") == ["a_b"]  # neither is _
    assert titles("zzz") == []


def test_list_pagination_and_order(client, manager, make_project):
    for i in range(5):
        make_project(None, f"P{i}")
    ids = [p["title"] for p in client.get("/api/projects?limit=2", headers=manager.headers).json()]
    assert ids == ["P4", "P3"]  # newest first
    assert [p["title"] for p in client.get("/api/projects?limit=2&offset=4", headers=manager.headers).json()] == ["P0"]


def test_update_project(client, admin, manager, dev, make_project):
    pid = make_project(admin)
    r = client.patch(f"/api/projects/{pid}", headers=manager.headers, json={"title": "Renamed", "description": "New"})
    assert r.status_code == 200 and r.json()["title"] == "Renamed"
    # partial update leaves other fields alone
    assert (
        client.patch(f"/api/projects/{pid}", headers=manager.headers, json={"title": "T2"}).json()["description"]
        == "New"
    )
    assert (
        client.patch(f"/api/projects/{pid}", headers=manager.headers, json={"description": ""}).json()["description"]
        is None
    )
    assert client.patch(f"/api/projects/{pid}", headers=dev.headers, json={"title": "Hax"}).status_code == 403
    assert client.patch(f"/api/projects/{pid}", headers=manager.headers, json={"title": ""}).status_code == 422
    assert client.patch(f"/api/projects/{pid}", headers=manager.headers, json={"title": None}).status_code == 422
    assert client.patch("/api/projects/9999", headers=manager.headers, json={"title": "x"}).status_code == 404


def test_delete_permissions(client, admin, manager, make_user, dev, make_project):
    from app.models import UserRole

    other_manager = make_user(UserRole.manager)
    owned, foreign = make_project(manager, "owned"), make_project(other_manager, "foreign")
    assert client.delete(f"/api/projects/{owned}", headers=dev.headers).status_code == 403
    assert client.delete(f"/api/projects/{foreign}", headers=manager.headers).status_code == 403  # not the owner
    assert client.delete(f"/api/projects/{owned}", headers=manager.headers).status_code == 204
    assert client.delete(f"/api/projects/{foreign}", headers=admin.headers).status_code == 204  # admin can
    assert client.delete(f"/api/projects/{foreign}", headers=admin.headers).status_code == 404


def test_deleting_a_project_deletes_its_tasks(client, admin, make_project, make_task):
    pid = make_project(admin)
    tid = make_task(pid)
    assert client.delete(f"/api/projects/{pid}", headers=admin.headers).status_code == 204
    assert client.get(f"/api/tasks/{tid}", headers=admin.headers).status_code == 404
    assert client.get("/api/dashboard", headers=admin.headers).json()["total_tasks"] == 0
