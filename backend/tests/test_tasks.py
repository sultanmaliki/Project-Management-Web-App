from datetime import date, timedelta

import pytest


def add_task(client, actor, project_id, **body):
    return client.post(f"/api/projects/{project_id}/tasks", headers=actor.headers, json={"title": "Do it", **body})


# ------------------------------------------------------------------ create
def test_create_task_with_defaults(client, manager, make_project):
    r = add_task(client, manager, make_project(manager))
    assert r.status_code == 201
    body = r.json()
    assert (body["status"], body["priority"]) == ("todo", "medium")
    assert body["assignee"] is None and body["deadline"] is None and body["description"] is None


def test_create_task_full(client, manager, dev, make_project):
    pid = make_project(manager)
    r = add_task(
        client,
        manager,
        pid,
        description="Details",
        status="in-progress",
        priority="high",
        deadline="2030-01-31",
        assignee_id=dev.id,
    )
    body = r.json()
    assert r.status_code == 201 and body["project_id"] == pid
    assert (body["status"], body["priority"], body["deadline"]) == ("in-progress", "high", "2030-01-31")
    assert body["assignee"] == {"id": dev.id, "name": f"Developer {dev.id}"}


def test_developers_cannot_create_tasks(client, dev, make_project, make_task):
    pid = make_project()
    make_task(pid, dev)  # even in a project they belong to
    assert add_task(client, dev, pid).status_code == 403
    assert client.post(f"/api/projects/{pid}/tasks", json={"title": "x"}).status_code == 401


def test_create_task_in_missing_project(client, manager):
    assert add_task(client, manager, 9999).status_code == 404


@pytest.mark.parametrize(
    "body",
    [
        {"title": ""},
        {"title": "  "},
        {"title": "t" * 201},
        {"title": None},
        {"status": "blocked"},
        {"status": "in_progress"},
        {"priority": "urgent"},
        {"deadline": "31/01/2030"},
        {"deadline": "not-a-date"},
        {"deadline": "2030-02-30"},
        {"assignee_id": "abc"},
        {"description": "d" * 5001},
    ],
)
def test_create_task_validation(client, manager, make_project, body):
    r = client.post(
        f"/api/projects/{make_project(manager)}/tasks", headers=manager.headers, json={"title": "ok", **body}
    )
    assert r.status_code == 422


def test_assignee_must_exist_and_be_active(client, manager, make_user, make_project):
    pid = make_project(manager)
    assert add_task(client, manager, pid, assignee_id=9999).status_code == 422
    assert add_task(client, manager, pid, assignee_id=make_user(active=False).id).status_code == 422


# ------------------------------------------------------------------ read
def test_get_task_visibility(client, dev, make_user, make_project, make_task):
    mine = make_task(make_project(), dev)
    hidden = make_task(make_project(None, "other"), make_user())
    assert client.get(f"/api/tasks/{mine}", headers=dev.headers).status_code == 200
    assert client.get(f"/api/tasks/{hidden}", headers=dev.headers).status_code == 404
    assert client.get("/api/tasks/9999", headers=dev.headers).status_code == 404
    assert client.get(f"/api/tasks/{mine}").status_code == 401


def test_my_tasks_lists_only_own_tasks_soonest_first(client, dev, make_user, make_project, make_task):
    project = make_project(None, "Zeus")
    other = make_user()
    make_task(project, dev, title="later", deadline=date(2031, 1, 1))
    make_task(project, dev, title="no date")
    make_task(project, dev, title="soon", deadline=date(2030, 1, 1), status="done")
    make_task(project, other, title="not mine")
    body = client.get("/api/tasks/mine", headers=dev.headers).json()
    assert [t["title"] for t in body] == ["soon", "later", "no date"]
    assert all(t["project_title"] == "Zeus" for t in body)
    done_only = client.get("/api/tasks/mine?status=done", headers=dev.headers).json()
    assert [t["title"] for t in done_only] == ["soon"]
    assert client.get("/api/tasks/mine?status=bogus", headers=dev.headers).status_code == 422


# ------------------------------------------------------------------ update
def test_manager_can_edit_any_field(client, manager, dev, make_project, make_task):
    tid = make_task(make_project(manager), None)
    r = client.patch(
        f"/api/tasks/{tid}",
        headers=manager.headers,
        json={
            "title": "New",
            "description": "D",
            "status": "done",
            "priority": "low",
            "deadline": "2030-05-05",
            "assignee_id": dev.id,
        },
    )
    body = r.json()
    assert r.status_code == 200
    assert (body["title"], body["status"], body["priority"], body["deadline"]) == ("New", "done", "low", "2030-05-05")
    assert body["assignee"]["id"] == dev.id


def test_patch_only_changes_supplied_fields_and_null_clears(client, manager, dev, make_project, make_task):
    tid = make_task(make_project(manager), dev, description="keep", deadline=date(2030, 1, 1), priority="high")
    unchanged = client.patch(f"/api/tasks/{tid}", headers=manager.headers, json={}).json()
    assert unchanged["description"] == "keep" and unchanged["assignee"]["id"] == dev.id
    cleared = client.patch(
        f"/api/tasks/{tid}", headers=manager.headers, json={"assignee_id": None, "deadline": None, "description": None}
    ).json()
    assert (cleared["assignee"], cleared["deadline"], cleared["description"]) == (None, None, None)
    assert cleared["priority"] == "high"


@pytest.mark.parametrize(
    "body",
    [
        {"title": None},
        {"title": ""},
        {"status": None},
        {"status": "nope"},
        {"priority": None},
        {"deadline": "yesterday"},
    ],
)
def test_patch_validation(client, manager, make_project, make_task, body):
    tid = make_task(make_project(manager))
    assert client.patch(f"/api/tasks/{tid}", headers=manager.headers, json=body).status_code == 422


def test_patch_rejects_unknown_assignee(client, manager, make_project, make_task):
    tid = make_task(make_project(manager))
    assert client.patch(f"/api/tasks/{tid}", headers=manager.headers, json={"assignee_id": 9999}).status_code == 422


def test_developer_can_change_status_of_own_task(client, dev, make_project, make_task):
    tid = make_task(make_project(), dev)
    for status in ("in-progress", "done", "todo"):
        r = client.patch(f"/api/tasks/{tid}", headers=dev.headers, json={"status": status})
        assert r.status_code == 200 and r.json()["status"] == status


@pytest.mark.parametrize(
    "body",
    [
        {"title": "hijack"},
        {"assignee_id": None},
        {"priority": "low"},
        {"deadline": "2030-01-01"},
        {"status": "done", "title": "sneaky"},
        {"description": "x"},
    ],
)
def test_developer_cannot_change_anything_but_status(client, dev, make_project, make_task, body):
    tid = make_task(make_project(), dev)
    assert client.patch(f"/api/tasks/{tid}", headers=dev.headers, json=body).status_code == 403
    assert client.get(f"/api/tasks/{tid}", headers=dev.headers).json()["title"] == "Write docs"


def test_developer_cannot_touch_teammates_or_unassigned_tasks(client, dev, make_user, make_project, make_task):
    pid = make_project()
    make_task(pid, dev)  # gives dev visibility of the project
    teammate_task = make_task(pid, make_user())
    unassigned_task = make_task(pid, None)
    for tid in (teammate_task, unassigned_task):
        assert client.patch(f"/api/tasks/{tid}", headers=dev.headers, json={"status": "done"}).status_code == 403
    # and a developer who can't even see the project gets a 404
    outsider = make_user()
    assert (
        client.patch(f"/api/tasks/{teammate_task}", headers=outsider.headers, json={"status": "done"}).status_code
        == 404
    )


def test_developer_cannot_reassign_a_task_to_themselves(client, dev, make_user, make_project, make_task):
    pid = make_project()
    make_task(pid, dev)
    other = make_task(pid, make_user())
    assert client.patch(f"/api/tasks/{other}", headers=dev.headers, json={"assignee_id": dev.id}).status_code == 403


# ------------------------------------------------------------------ delete
def test_delete_task(client, manager, dev, make_project, make_task):
    pid = make_project(manager)
    tid = make_task(pid, dev)
    assert client.delete(f"/api/tasks/{tid}", headers=dev.headers).status_code == 403
    assert client.delete(f"/api/tasks/{tid}", headers=manager.headers).status_code == 204
    assert client.delete(f"/api/tasks/{tid}", headers=manager.headers).status_code == 404
    assert client.get(f"/api/projects/{pid}", headers=manager.headers).json()["task_count"] == 0


# ------------------------------------------------------------------ dashboard
def test_dashboard_for_managers_covers_everything(client, manager, dev, make_project, make_task):
    p1, p2 = make_project(None, "a"), make_project(None, "b")
    yesterday, tomorrow = date.today() - timedelta(days=1), date.today() + timedelta(days=1)
    make_task(p1, dev, status="todo", deadline=yesterday)  # overdue
    make_task(p1, None, status="in-progress", deadline=yesterday)  # overdue
    make_task(p2, dev, status="done", deadline=yesterday)  # done => never overdue
    make_task(p2, None, status="todo", deadline=tomorrow)  # not yet
    make_task(p2, None, status="todo")  # no deadline
    assert client.get("/api/dashboard", headers=manager.headers).json() == {
        "project_count": 2,
        "total_tasks": 5,
        "todo": 3,
        "in_progress": 1,
        "done": 1,
        "overdue": 2,
    }


def test_dashboard_for_developers_is_scoped_to_their_tasks(client, dev, make_user, make_project, make_task):
    other = make_user()
    p1, p2, p3 = make_project(None, "a"), make_project(None, "b"), make_project(None, "c")
    yesterday = date.today() - timedelta(days=1)
    make_task(p1, dev, status="todo", deadline=yesterday)
    make_task(p1, dev, status="done")
    make_task(p2, dev, status="in-progress")
    make_task(p3, other, status="todo", deadline=yesterday)
    assert client.get("/api/dashboard", headers=dev.headers).json() == {
        "project_count": 2,
        "total_tasks": 3,
        "todo": 1,
        "in_progress": 1,
        "done": 1,
        "overdue": 1,
    }


def test_dashboard_when_empty(client, dev):
    assert client.get("/api/dashboard", headers=dev.headers).json() == {
        "project_count": 0,
        "total_tasks": 0,
        "todo": 0,
        "in_progress": 0,
        "done": 0,
        "overdue": 0,
    }
