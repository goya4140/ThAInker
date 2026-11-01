"""Offline, isolated five-stage ThAInker product demo.

Run: .venv/bin/python -m workbench.demo --port 8769
Open /demo.html. No Codex login, GPU, remote server or model API is used.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import sys
import threading
import time
from contextlib import ExitStack
from functools import partial
from pathlib import Path
from unittest.mock import patch
from urllib.parse import quote, urlsplit

from . import demo_content as content
from . import server
from .demo_adapters import DemoDesignRunner, figure_runner, generate_figure, table_runner

DISCLOSURE_HTML = (
    '<aside class="thainker-demo-banner" role="note" style="position:relative;z-index:1000;'
    "left:0;right:0;padding:10px 20px;background:#fff1c7;color:#5c4300;font:14px/1.6 system-ui;"
    'text-align:center">'
    "<strong>DEMO · 模拟演示</strong>　调研、评审与实验数据均为预置模拟内容，未运行真实训练。"
    '　<a href="/demo.html" style="color:inherit;text-decoration:underline">返回演示控制台 ↗</a></aside>'
)


def disclose(html):
    return (
        html.replace("<body", '<body data-demo="true"', 1)
        .replace("</body>", DISCLOSURE_HTML + "</body>", 1)
        .replace("position:relative;z-index:1000;", "position:fixed;bottom:0;z-index:1000;", 1)
    )


class DemoHandler(server.WorkbenchHandler):
    def route(self):
        path = urlsplit(self.path).path
        if self.command in {"GET", "HEAD"} and path in {"/", "/index.html", "/journey.html"}:
            file = server.WEB_ROOT / (
                "index.html" if path in {"/", "/index.html"} else "journey.html"
            )
            data = disclose(file.read_text()).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(data)
            return
        super().route()

    do_GET = route
    do_HEAD = route

    def workbench_api(self, path):
        if not (path == "/api/demo" or path.startswith("/api/demo/")):
            return super().workbench_api(path)
        try:
            payload = {}
            if self.command == "POST":
                origin = self.headers.get("Origin")
                if origin and urlsplit(origin).netloc != self.headers.get("Host"):
                    raise ValueError("演示操作不允许跨站请求。")
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 8192:
                    raise ValueError("演示请求为空或过大。")
                payload = json.loads(self.rfile.read(size))
                if not isinstance(payload, dict):
                    raise ValueError("请求必须是 JSON 对象。")
            result = self.workbench.demo.handle(self.command, path, payload)
            status = 200
        except (ValueError, KeyError, TypeError) as error:
            status, result = 400, {"error": str(error)}
        data = json.dumps(result, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


class DemoController:
    def __init__(self, app):
        self.app = app
        self.lock = threading.RLock()

    def flows(self):
        return [f for f in self.app.pipeline.list() if f.get("simulation") is True]

    def handle(self, method, path, payload):
        with self.lock:
            if method == "GET" and path == "/api/demo":
                return self.snapshot()
            if method != "POST":
                raise ValueError("未知演示接口。")
            action = path.rsplit("/", 1)[-1]
            if action == "start":
                if any(f["status"] != "completed" for f in self.flows()):
                    raise ValueError("已有未完成的演示，请先继续当前流程。")
                selection = payload.get("selection", "auto")
                if selection not in {"auto", "manual"}:
                    raise ValueError("未知选题方式。")
                with self.app.pipeline.lock:
                    created = self.app.pipeline.create(
                        {
                            "title": content.TITLE,
                            "direction": content.DIRECTION,
                            "paper_count": 2,
                            "selection": selection,
                        }
                    )
                    flow = self.app.pipeline.get(created["id"])
                    flow.update(
                        simulation=True,
                        disclosure=content.DISCLOSURE,
                        demo_fail_once=payload.get("fail_once") is True,
                    )
                    self.app.pipeline.save(flow)
                return self.snapshot()
            flows = self.flows()
            if not flows:
                raise ValueError("请先开始一次演示。")
            flow = self.app.pipeline.get_view(flows[0]["id"])
            if action in {"pause", "resume"}:
                self.app.pipeline.action(
                    flow["id"],
                    action,
                    {"recovery_note": "【模拟演示】继续原任务，保留已完成产物。"},
                )
            elif action == "select":
                if flow["status"] != "waiting_selection":
                    raise ValueError("当前未等待选题。")
                self.app.pipeline.action(flow["id"], "select", {"idea_id": payload.get("idea_id")})
            elif action == "references":
                if not flow.get("figure_id"):
                    raise ValueError("尚未进入主图阶段。")
                # Consent is still explicit; merely visiting the page never confirms references.
                self.app.figure.select_references(flow["figure_id"], {"confirm": True})
            else:
                raise ValueError("未知演示操作。")
            return self.snapshot()

    def snapshot(self):
        flows = self.flows()
        flow = flows[0] if flows else None
        result = {
            "simulation": True,
            "disclosure": content.DISCLOSURE,
            "title": content.TITLE,
            "flow": flow,
            "candidates": [],
            "metrics": [],
            "artifacts": [],
            "links": {},
            "references": [],
            "steps": [],
            "previous_runs": max(0, len(flows) - 1),
        }
        if not flow:
            return result
        links = result["links"]
        if flow.get("search_run"):
            links["search"] = "/auto-search/?run=" + quote(flow["search_run"], safe="")
        if flow["status"] == "waiting_selection":
            result["candidates"] = self.app.pipeline.candidates(flow)
        if flow.get("design_id"):
            task = self.app.design.get(flow["design_id"])
            links["design"] = "/auto-design/?task=" + task["id"]
            summary = Path(task["run_dir"]) / "result_summary.json"
            if summary.exists():
                result["metrics"] = json.loads(summary.read_text()).get("aggregates", [])
                base = f"/auto-design/api/tasks/{task['id']}/files/"
                result["artifacts"].extend(
                    [
                        {"label": "模拟实验原始数据", "url": base + "raw_results.json"},
                        {"label": "真实计算的结果汇总", "url": base + "result_summary.json"},
                    ]
                )
        if flow.get("writing_id"):
            links["writing"] = "/auto-writing/?project=" + quote(flow["writing_id"], safe="")
        if flow.get("table_id"):
            links["table"] = "/auto-table/?project=" + quote(flow["table_id"], safe="")
        if flow.get("figure_id"):
            project = self.app.figure.load(flow["figure_id"])
            encoded = quote(project["id"], safe="")
            links["figure"] = "/auto-figure/?project=" + encoded
            result["steps"] = project["completed_steps"]
            base = f"/auto-figure/api/projects/{encoded}/files/"
            result["references"] = [
                {"slot": ref["slot"], "url": base + ref["path"]} for ref in project["references"]
            ]
            result["awaiting_references"] = project["status"] == "awaiting_references"
            if project["status"] == "ready":
                attempt = f"attempt-{project['attempt']}/"
                result["artifacts"].extend(
                    [
                        {
                            "label": "完整演示论文 PDF",
                            "url": base + attempt + "manuscript-with-figure.pdf",
                            "kind": "pdf",
                        },
                        {
                            "label": "可编辑方法主图 PPTX",
                            "url": base + attempt + "method-overview.pptx",
                        },
                        {
                            "label": "论文 LaTeX 源码 ZIP",
                            "url": base + attempt + "manuscript-with-figure.zip",
                        },
                        {"label": "完整演示交付包", "url": base + attempt + "deliverables.zip"},
                    ]
                )
                result["figure_preview"] = base + attempt + "method-overview.png"
        return result


class DemoWorkbench(server.Workbench):
    def __init__(self, root, host="127.0.0.1", port=8769, delay=0.6):
        root = Path(root).resolve()
        marker = root / ".thainker-demo.json"
        if root.exists() and any(root.iterdir()) and not marker.is_file():
            raise ValueError("演示目录必须为空或包含 .thainker-demo.json，不能使用正式任务目录。")
        root.mkdir(parents=True, exist_ok=True)
        marker.write_text(json.dumps({"simulation": True, "disclosure": content.DISCLOSURE}))
        super().__init__(root, root / "workbench", host=host, port=port)
        self.demo = DemoController(self)
        self.overrides = ExitStack()
        self.delay = delay
        self.server.RequestHandlerClass = partial(DemoHandler, modules=self.modules, workbench=self)
        try:
            self.configure()
        except Exception:
            self.close()
            raise

    def configure(self):
        search, writing = server.search, server.writing
        manifest = search.direction_research.build_manifest(
            content.DIRECTION,
            {
                "scope_summary": "【模拟】两个预置文献卡，不执行真实文献检索。",
                "papers": [content.paper(1), content.paper(2)],
            },
            2,
        )
        ids = [p["id"] for p in manifest["papers"]]

        def wait(cancel_event=None):
            if cancel_event is not None:
                if cancel_event.wait(self.delay):
                    raise RuntimeError("演示已暂停，已有产物保留。")
            else:
                time.sleep(self.delay)

        def research(*args, **kwargs):
            wait(kwargs.get("cancel_event"))
            return manifest

        def idea(*args, **kwargs):
            wait(kwargs.get("cancel_event"))
            return content.idea_markdown()

        def evaluate(*args, **kwargs):
            wait(kwargs.get("cancel_event"))
            return content.evaluation(ids)

        def write(project, action, *args, **kwargs):
            wait()
            run = writing.WRITING_RUNS_ROOT / project["id"]
            with (run / "demo-model-calls.jsonl").open("a") as record:
                record.write(json.dumps({"action": action, "simulation": True}) + "\n")
            flow = (
                self.pipeline.get_view(project["pipeline_id"]) if project.get("pipeline_id") else {}
            )
            failure_marker = run / "demo-failure-injected.json"
            if action == "method" and flow.get("demo_fail_once") and not failure_marker.exists():
                failure_marker.write_text('{"simulation":true,"injected_failure":"method"}')
                raise RuntimeError(
                    "【演示故障】模拟写作步骤中断。点击继续即可复用已有章节；此故障仅注入一次。"
                )
            if action == "intro_research":
                return content.intro_research()
            if action == "related_work_plan":
                return {"subsections": [{"title": t} for t in content.RELATED_TITLES]}
            if action == "related_work_research":
                return {
                    "subsections": [
                        {
                            "title": t,
                            "thesis": "Synthetic demonstration context.",
                            "papers": [content.reference(i) for i in range(4, 7)],
                            "synthesis": "These fictional entries demonstrate the handoff format.",
                            "unresolved_gap": "Scientific validity requires real evidence.",
                        }
                        for t in content.RELATED_TITLES
                    ]
                }
            if action == "reference_insertion":
                return content.reference_result()
            if action == "latex_publication":
                return {"content": content.manuscript_tex()}
            return {"content": content.section(action)}

        original_navigation = server.add_navigation
        self.overrides.enter_context(
            patch.object(
                server,
                "add_navigation",
                lambda data, module: disclose(original_navigation(data, module).decode()).encode(),
            )
        )
        self.overrides.enter_context(
            patch.object(search.direction_research, "execute_research_agent", research)
        )
        self.overrides.enter_context(
            patch.object(search.research_pipeline.generate_idea, "run_codex", idea)
        )
        self.overrides.enter_context(
            patch.object(search.research_pipeline, "execute_json_agent", evaluate)
        )
        self.overrides.enter_context(patch.object(writing, "invoke_codex_json", write))
        environment = {"FIGURECRAFTER_PYTHON": sys.executable}
        if not os.environ.get("LATEX_COMPILER"):
            compiler = (
                shutil.which("latexmk") or shutil.which("pdflatex") or shutil.which("tectonic")
            )
            if compiler:
                environment["LATEX_COMPILER"] = compiler
        self.overrides.enter_context(patch.dict(os.environ, environment))
        self.design.runner = DemoDesignRunner(self.delay)
        self.table.runner = table_runner(self.delay)
        self.figure.runner = figure_runner(self.delay)
        self.figure.generator = generate_figure
        self.figure.compiler = writing.compile_latex

    def close(self):
        try:
            self.prepare_restart()
            deadline = time.monotonic() + 12
            while not self.runtime_state()["idle"] and time.monotonic() < deadline:
                time.sleep(0.05)
            super().close()
        finally:
            self.overrides.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8769)
    parser.add_argument("--data-dir", type=Path, default=Path("assets/output/demo"))
    parser.add_argument(
        "--delay", type=float, default=0.6, help="Per synthetic model step, 0 to 3 seconds"
    )
    args = parser.parse_args()
    if not 0 <= args.delay <= 3:
        parser.error("delay 必须在 0 到 3 秒之间。")
    app = DemoWorkbench(args.data_dir, args.host, args.port, args.delay)
    app.start_modules()
    print(f"ThAInker DEMO: http://{args.host}:{app.server.server_port}/demo.html", flush=True)
    print(f"Isolated synthetic data: {app.workspace}", flush=True)
    try:
        app.server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        app.close()


if __name__ == "__main__":
    main()
