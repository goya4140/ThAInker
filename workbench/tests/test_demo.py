"""Offline demo acceptance: real HTTP, original gates, TeX and downloadable artifacts."""

import io
import json
import threading
import time
import zipfile
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import pymupdf
import pytest

from workbench.demo import DemoWorkbench
from workbench.server import writing


@pytest.fixture
def demo(tmp_path):
    if writing.latex_compiler() is None:
        pytest.skip("Demo acceptance needs a real LaTeX compiler")
    app = DemoWorkbench(tmp_path, port=0, delay=0)
    app.start_modules()
    thread = threading.Thread(target=app.server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{app.server.server_port}"

    def request(path, payload=None):
        req = Request(
            base + path,
            data=None if payload is None else json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urlopen(req, timeout=20) as response:
            return response.read()

    def api(path="/api/demo", payload=None):
        return json.loads(request(path, payload))

    yield app, request, api
    app.server.shutdown()
    app.close()
    thread.join(5)


def wait(api, predicate, timeout=90):
    deadline = time.monotonic() + timeout
    snapshot = None
    while time.monotonic() < deadline:
        snapshot = api()
        if predicate(snapshot):
            return snapshot
        if snapshot["flow"] and snapshot["flow"]["status"] == "blocked":
            raise AssertionError(snapshot["flow"]["message"])
        time.sleep(0.1)
    raise AssertionError(snapshot)


def test_five_stage_demo_manual_gates_recovery_and_real_deliverables(demo):
    app, request, api = demo
    assert api()["flow"] is None  # Reading/opening the demo never starts work.
    api("/api/demo/start", {"selection": "manual", "fail_once": True})
    with pytest.raises(HTTPError):
        api("/api/demo/start", {})
    snapshot = wait(api, lambda s: s["flow"]["status"] == "waiting_selection")
    assert len(snapshot["candidates"]) == 2
    assert not app.design.list()
    api("/api/demo/pause", {})
    assert api()["flow"]["status"] == "paused"
    api("/api/demo/resume", {})
    snapshot = wait(api, lambda s: s["flow"]["status"] == "waiting_selection")
    api("/api/demo/select", {"idea_id": snapshot["candidates"][0]["id"]})
    snapshot = wait(api, lambda s: s["flow"]["status"] == "blocked")
    assert "演示故障" in snapshot["flow"]["message"]
    writing_id = snapshot["flow"]["writing_id"]
    # Reference insertion can update Introduction later; generation itself must not repeat.
    intro = writing.section_output_path(writing.WRITING_RUNS_ROOT / writing_id, "intro")
    previous_intro = intro.read_bytes()
    api("/api/demo/resume", {})
    snapshot = wait(api, lambda s: s.get("awaiting_references"))
    assert json.loads(previous_intro)["intro"] in json.loads(intro.read_text())["intro"]
    calls = [
        json.loads(line)["action"]
        for line in (writing.WRITING_RUNS_ROOT / writing_id / "demo-model-calls.jsonl")
        .read_text()
        .splitlines()
    ]
    assert calls.count("intro") == 1 and calls.count("method") == 2
    assert not app.figure.jobs
    assert snapshot["flow"]["writing_id"] == writing_id
    assert [round(m["mean"], 2) for m in snapshot["metrics"]] == [0.79, 0.85]
    assert all(m["n"] == 3 for m in snapshot["metrics"])
    assert b"DEMO" in request(snapshot["links"]["design"])
    api("/api/demo/references", {})
    snapshot = wait(api, lambda s: s["flow"]["status"] == "completed")
    assert len(snapshot["steps"]) == 7
    assert len(app.design.list()) == len(app.table.list()) == len(app.figure.list()) == 1
    artifacts = {a["label"]: request(a["url"]) for a in snapshot["artifacts"]}
    raw = json.loads(artifacts["模拟实验原始数据"])
    assert raw["simulation"] is True and len(raw["runs"]) == 6
    with pymupdf.open(stream=artifacts["完整演示论文 PDF"], filetype="pdf") as doc:
        text = "\n".join(page.get_text() for page in doc)
        assert len(doc) >= 2 and "SYNTHETIC DEMO" in text
        assert "0.79" in text and "0.85" in text
        assert "Synthetic method overview" in text
    with zipfile.ZipFile(io.BytesIO(artifacts["可编辑方法主图 PPTX"])) as archive:
        assert b"Local encoder" in archive.read("ppt/slides/slide1.xml")
    with zipfile.ZipFile(io.BytesIO(artifacts["完整演示交付包"])) as archive:
        assert "manuscript-with-figure.pdf" in archive.namelist()
    assert len({e["stage"] for e in snapshot["flow"]["events"]}) == 5


def test_demo_refuses_existing_unmarked_directory(tmp_path):
    (tmp_path / "important.json").write_text("preserve me")
    with pytest.raises(ValueError, match="正式任务目录"):
        DemoWorkbench(tmp_path, port=0)
    assert (tmp_path / "important.json").read_text() == "preserve me"


def test_demo_restart_preserves_identity_and_pauses(tmp_path):
    app = DemoWorkbench(tmp_path, port=0, delay=0)
    snapshot = app.demo.handle("POST", "/api/demo/start", {})
    flow_id = snapshot["flow"]["id"]
    # No module threads were started; close just the bound servers to emulate shutdown.
    app.close()
    recovered = DemoWorkbench(tmp_path, port=0, delay=0)
    try:
        snapshot = recovered.demo.snapshot()
        assert snapshot["flow"]["id"] == flow_id
        assert snapshot["flow"]["status"] == "paused"
        assert not recovered.design.list()
    finally:
        recovered.close()
