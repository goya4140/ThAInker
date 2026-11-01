"""Offline adapters, installed only by ``python -m workbench.demo``.

Model judgments and research are synthetic. State gates, local simulator execution,
aggregation, LaTeX compilation, native object inspection and downloads remain real.
"""

from __future__ import annotations

import json
import shlex
import sys
import time
from pathlib import Path

from auto_design.effects import compare_effects
from auto_design.io import write_json
from auto_design.results import ingest_results
from auto_design.runner import STAGE_ORDER, run_local_commands
from auto_design.state import advance_run

from . import demo_content as content


class DemoDesignRunner:
    def __init__(self, delay):
        self.delay = delay

    def invoke(self, prompt, workspace, log_dir, on_event):
        context = json.loads(prompt.split("TASK_CONTEXT_JSON=\n")[-1])
        action, directory = context["action"], Path(context["run_dir"])
        time.sleep(self.delay)
        log_dir.mkdir(parents=True, exist_ok=True)
        write_json(
            log_dir / "demo-call.json",
            {"action": action, "simulation": True, "disclosure": content.DISCLOSURE},
        )
        on_event({"type": "demo", "message": f"【模拟演示】{action}"})
        if action == "design":
            self.design(directory)
            next_action = "run"
        elif action == "run":
            next_action = self.run(directory)
        elif action == "diagnosis":
            (directory / "result_diagnosis.md").write_text(
                "# DEMO result diagnosis\n\n"
                + content.DISCLOSURE
                + "\n\nSynthetic Dice: baseline 0.79 +/- 0.01, ours 0.85 +/- 0.01. "
                "The +0.06 difference is predetermined, not an empirical finding.\n"
            )
            (directory / "result_route.md").write_text(
                "route: report\nowner_stage: run\nexecution_required: no\nDEMO ONLY\n"
            )
            write_json(
                directory / "reports/report_manifest.json",
                {"simulation": True, "outputs": [], "disclosure": content.DISCLOSURE},
            )
            (directory / "reports/index.html").write_text(
                "<!doctype html><meta charset='utf-8'><h1>DEMO — synthetic results</h1>"
                "<p>No real training or scientific validation.</p><p>Baseline: 0.79; ours: 0.85.</p>"
            )
            advance_run(
                directory,
                "RESULT_DIAGNOSIS_READY",
                changed_input="DEMO diagnosis",
                literal_result="synthetic records complete",
            )
            next_action = "audit"
        elif action == "audit":
            (directory / "integrity_audit.md").write_text(
                "Verdict: PASS\n\nDEMO: preset engineering audit, not a model or scientific review.\n"
                + content.DISCLOSURE
                + "\nThe simulator and deterministic record checks ran locally.\n"
            )
            advance_run(
                directory,
                "INTEGRITY_AUDIT_PASS",
                changed_input="DEMO audit",
                literal_result="engineering fixture PASS only",
            )
            advance_run(
                directory,
                "COMPLETE",
                changed_input="DEMO completion",
                literal_result="engineering fixture complete",
            )
            next_action = "none"
        else:
            raise ValueError("演示不支持此设计动作：" + action)
        return {
            "outcome": "paused" if next_action == "run" and action == "run" else "completed",
            "summary": f"【模拟演示】{action} 已处理；不代表科研验证。",
            "next_action": next_action,
        }

    def design(self, directory):
        (directory / "experiment_design.md").write_text(
            "# DEMO Experiment Design\n\n" + content.DISCLOSURE + "\n\n"
            "## Method\n" + content.METHOD + "\n\n"
            "## Protocol\nTwo variants, three seeds, six predetermined synthetic Dice values. "
            "No GPU, data download or training. R0 is not required for this simulator.\n\n"
            "## Coverage audit\nVerdict: PASS\n\n## Absent families\n"
            "- ablation: engineering demo only, no component effectiveness claim\n"
            "- case_study: no real samples or scientific case claims\n"
            "- analysis: no scientific mechanism analysis is claimed\n"
        )
        write_json(
            directory / "expected_effects.json",
            {
                "schema_version": "1.0",
                "value_status": "SIMULATED_TARGET",
                "generated_by": "design",
                "entries": [
                    {
                        "entry_id": "DEMO-main",
                        "experiment_id": "E1",
                        "family": "main",
                        "evidence_class": "CLAIM_BEARING",
                        "claim_ids": ["DEMO-C1"],
                        "simulation": True,
                        "variant_id": "ours",
                        "benchmark_task_id": "demo-small-target",
                        "metric": "dice",
                        "simulated_target": 0.85,
                        "target_basis": "design_estimate",
                        "decision_threshold": ">= 0.80",
                        "on_miss": "iteration",
                    }
                ],
            },
        )
        advance_run(
            directory,
            "EXPERIMENT_DESIGN_READY",
            changed_input="DEMO preset design",
            literal_result="engineering fixture only",
        )

    def run(self, directory):
        generated = directory / "generated_project"
        generated.mkdir(exist_ok=True)
        cells, runs = [], []
        for variant, values in content.VARIANTS.items():
            for seed, value in enumerate(values, 1):
                cell = {
                    "experiment_id": "E1",
                    "variant_id": variant,
                    "benchmark_task_id": "demo-small-target",
                    "seed": seed,
                    "family": "main",
                    "evidence_class": "CLAIM_BEARING",
                    "simulation": True,
                }
                cells.append({**cell, "metrics": ["dice"]})
                runs.append(
                    {**cell, "status": "completed", "metrics": {"dice": value}, "simulation": True}
                )
        (directory / "implementation_notes.md").write_text(content.DISCLOSURE)
        write_json(
            directory / "result_contract.json",
            {"primary_result": "simulated_results.json", "simulation": True},
        )
        write_json(
            directory / "experiment_schedule.json", {"schema_version": "1.0", "cells": cells}
        )
        results = {
            "schema_version": "1.0",
            "simulation": True,
            "disclosure": content.DISCLOSURE,
            "runs": runs,
        }
        script = generated / "simulate.py"
        script.write_text(
            "import json\nfrom pathlib import Path\n"
            f"data = json.loads({json.dumps(results)!r})\n"
            f"Path({str(directory / 'simulated_results.json')!r}).write_text(json.dumps(data, indent=2))\n"
            "print('DEMO: wrote six predetermined synthetic records; no training or GPU used.')\n"
        )
        noop = shlex.join([sys.executable, "-c", "print('DEMO simulator stage; no GPU training')"])
        plan = {stage: [noop] for stage in STAGE_ORDER}
        plan["experiment"] = [shlex.join([sys.executable, str(script)])]
        write_json(directory / "command_plan.json", plan)
        if context_stage(directory) != "IMPLEMENTATION_READY":
            advance_run(
                directory,
                "IMPLEMENTATION_READY",
                changed_input="DEMO simulator",
                literal_result="CPU-only simulator ready",
            )
        execution = run_local_commands(directory)
        if not execution["workflow_complete"]:
            return "run"
        ingest_results(directory, directory / "simulated_results.json")
        compare_effects(directory)
        advance_run(
            directory,
            "EXECUTION_COMPLETE",
            changed_input="DEMO synthetic records",
            literal_result="simulator completed, no real experiment",
        )
        return "diagnosis"


def context_stage(directory):
    from auto_design.state import read_current_stage

    return read_current_stage(directory)


def table_runner(delay):
    def invoke(prompt, schema, directory, logs, name, job):
        time.sleep(delay)
        job.check()
        if name == "design":
            return {
                "rationale": "DEMO preset: preserve every synthetic value and disclosure.",
                "tables": [],
                "preamble": "",
                "replacements": [
                    {"filename": p.name, "content": p.read_text()}
                    for p in (directory / "inspection/original-tables").glob("*.tex")
                ],
            }
        return {
            "passed": True,
            "findings": ["DEMO preset review; not a visual model judgment.", content.DISCLOSURE],
            "inspected_pages": [str(p) for p in (directory / "patched/pages").glob("*.png")],
        }

    return invoke


def figure_runner(delay):
    def invoke(prompt, schema, directory, logs, name, job):
        time.sleep(delay)
        job.check()
        if name == "plan":
            return {
                "method_text": content.METHOD,
                "caption": "Synthetic method overview for the "
                "ThAInker demo; all components are hypothetical and unvalidated.",
                "source_file": "main.tex",
                "anchor": content.METHOD,
                "action": "insert_after",
                "placement": "column",
                "rationale": "DEMO: insert after the method description.",
                "evidence": [{"file": "main.tex", "quote": content.METHOD}],
            }
        return {
            "passed": True,
            "findings": [
                "DEMO preset review; not scientific or model validation.",
                content.DISCLOSURE,
            ],
            "inspected_pages": [str(p) for p in (directory / "pages").glob("*.png")],
        }

    return invoke


def generate_figure(inputs, destination, config, logs, job):
    """Real template-authored vector PDF and editable PPTX, not FigureCrafter inference.

    Both are authored from identical geometry. This offline adapter deliberately
    does not claim that the PDF was rendered from the PPTX by LibreOffice.
    """
    import pymupdf
    from pptx import Presentation
    from pptx.dml.color import RGBColor
    from pptx.enum.shapes import MSO_CONNECTOR, MSO_SHAPE
    from pptx.util import Inches, Pt

    job.check()
    destination.mkdir(parents=True, exist_ok=True)
    presentation = Presentation()
    presentation.slide_width, presentation.slide_height = Inches(16), Inches(9)
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    doc = pymupdf.open()
    page = doc.new_page(width=1152, height=648)
    page.draw_rect(page.rect, fill=(0.96, 0.97, 0.97), color=None)

    def text(x, y, w, h, value, size, color=(0.10, 0.19, 0.20)):
        box = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
        box.text_frame.word_wrap = True
        p = box.text_frame.paragraphs[0]
        p.text, p.font.size = value, Pt(size)
        p.font.color.rgb = RGBColor(*(int(c * 255) for c in color))
        remaining = page.insert_textbox(
            pymupdf.Rect(x * 72, y * 72, (x + w) * 72, (y + h) * 72),
            value,
            fontsize=size,
            color=color,
            fontname="helv",
        )
        if remaining < 0:
            raise ValueError("演示主图文本超出布局：" + value)

    text(0.7, 0.5, 14, 1.0, "Local evidence, preserved.", 32)
    text(0.7, 1.3, 14, 0.7, "ThAInker / template-authored method overview / SYNTHETIC DEMO", 17)
    names = [
        ("01  Input image", "Synthetic input only"),
        ("02  Local encoder", "Preserve high-resolution features"),
        ("03  Scale fusion", "Combine local and global features"),
        ("04  Prediction", "Produce a hypothetical output"),
    ]
    for i, (title, detail) in enumerate(names):
        x = 0.7 + i * 3.85
        shape = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(3), Inches(3.25), Inches(2.2)
        )
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor(226, 241, 235)
        shape.line.color.rgb = RGBColor(8, 125, 112)
        page.draw_rect(
            pymupdf.Rect(x * 72, 216, (x + 3.25) * 72, 374.4),
            color=(0.03, 0.49, 0.44),
            fill=(0.89, 0.95, 0.92),
            radius=0.07,
        )
        text(x + 0.18, 3.35, 2.9, 0.5, title, 18)
        text(x + 0.18, 4.1, 2.9, 0.9, detail, 14)
        if i < 3:
            line = slide.shapes.add_connector(
                MSO_CONNECTOR.STRAIGHT, Inches(x + 3.25), Inches(4.1), Inches(x + 3.85), Inches(4.1)
            )
            line.line.color.rgb = RGBColor(8, 125, 112)
            page.draw_line(
                ((x + 3.25) * 72, 295.2),
                ((x + 3.85) * 72, 295.2),
                color=(0.03, 0.49, 0.44),
                width=2,
            )
    text(0.7, 6.2, 14.5, 0.6, "Training only: balanced sampling. Inference never reads labels.", 20)
    text(
        0.7,
        7.5,
        14.5,
        0.8,
        "DEMO ONLY. No real model was trained. No scientific performance claim is made.",
        17,
    )
    files = {
        key: destination / name
        for key, name in {
            "pptx": "demo-method.pptx",
            "pdf": "demo-method.pdf",
            "png": "demo-method.png",
            "caption": "caption.md",
            "validation": "validation.json",
            "freeze": "freeze.json",
        }.items()
    }
    presentation.save(files["pptx"])
    doc.save(files["pdf"])
    page.get_pixmap(matrix=pymupdf.Matrix(1.5, 1.5)).save(files["png"])
    doc.close()
    files["caption"].write_text(content.DISCLOSURE + "\n" + content.METHOD)
    from auto_figure.manuscript import digest

    hashes = {p.name: digest(p) for p in files.values() if p.exists()}
    write_json(
        files["freeze"],
        {
            "simulation": True,
            "files": hashes,
            "provenance": "Template-authored PDF and PPTX; no LibreOffice rendering.",
        },
    )
    write_json(
        files["validation"],
        {
            "simulation": True,
            "freeze": {"errors": [], "unexpected_files": []},
            "native_shapes": len(slide.shapes),
            "files": hashes,
            "disclosure": content.DISCLOSURE,
        },
    )
    return {k: str(p) for k, p in files.items()}
