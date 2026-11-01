"""Deterministic, explicitly synthetic content for the offline product demonstration."""

from __future__ import annotations

DISCLOSURE = "DEMO / SYNTHETIC: no real literature search, model training or scientific validation."
TITLE = "演示：小目标识别中的局部证据保留"
DIRECTION = "【模拟演示】通过局部证据保留、多尺度融合与平衡采样改善小目标视觉识别。"
METHOD = (
    "The demo encoder preserves a high-resolution residual feature map. "
    "A multi-scale fusion module combines local and global features before the prediction head. "
    "Balanced sampling is used during training only; inference consumes an image without labels."
)
VARIANTS = {"baseline": [0.78, 0.79, 0.80], "ours": [0.84, 0.85, 0.86]}
RELATED_TITLES = ["Local Evidence", "Multi-scale Fusion", "Balanced Training"]


def paper(index):
    return {
        "title": f"DEMO {index}: Synthetic study of local visual evidence",
        "authors": "ThAInker Demo Team (fictional study)",
        "year": 2026,
        "venue": "Synthetic demonstration, not a publication",
        "domain": "Small-target visual recognition (simulated)",
        "source_url": f"https://example.org/thainker-demo/paper-{index}",
        "source_scope": "模拟文献卡，仅演示检索产物结构；未进行真实检索。",
        "reported_weakness": "【模拟】小目标局部细节可能在降采样和全局聚合中丢失。",
        "evidence": ["【模拟】预置的小目标子集示例。", "【模拟】预置的局部特征对比示例。"],
        "evidence_status": "directly_reported",
        "source_method_summary": "【模拟】固定分辨率编码器与预测头。",
        "inference_constraints": "仅输入图像；不读取测试标签。所有数据均为演示构造。",
        "benchmark_candidates": [
            {
                "name": "DEMO Synthetic Small-target Set (not a real benchmark)",
                "public_url": "https://example.org/thainker-demo/dataset",
                "task_type": "模拟分割",
                "usage_mode": "direct",
                "released_labels": "演示中构造的标签说明，不下载任何真实数据集。",
                "supported_evaluation": "模拟 Dice 数据的完整性与汇总。",
                "allowed_adaptation": "仅用于软件演示。",
            }
        ],
        "feasibility_status": "ready",
        "feasibility_blocker": "",
        "simulation": True,
        "disclosure": DISCLOSURE,
    }


def idea_markdown():
    sections = [
        "# Idea: DEMO Local Evidence Preservation\n\n" + DISCLOSURE,
        "## Weakness\n【模拟】小目标的局部证据在全局聚合中稀释。本方案仅用于展示系统流程。",
        (
            "## Root-Cause Analysis\n\n"
            "### Cause (1): **Detail dilution**\n局部特征被背景聚合稀释。\n\n"
            "### Cause (2): **Scale mismatch**\n固定分辨率无法表达不同尺度。\n\n"
            "### Cause (3): **Training imbalance**\n背景训练样本占比过高。"
        ),
        (
            "## Contribution\n\n"
            "\\noindent \\textbf{(1)} For Cause (1), we propose \\textbf{local evidence preservation}.\n\n"
            "\\noindent \\textbf{(2)} For Cause (2), we propose \\textbf{multi-scale feature fusion}.\n\n"
            "\\noindent \\textbf{(3)} For Cause (3), we propose \\textbf{balanced training sampling}."
        ),
        "## Method",
    ]
    for i, (name, incoming, outgoing) in enumerate(
        [
            ("Local preservation", "Early image features", "Preserved local features"),
            ("Multi-scale fusion", "Local and global features", "Fused features"),
            ("Balanced training", "Fused features and training labels", "Prediction head"),
        ],
        1,
    ):
        sections.append(
            f"### Contribution ({i}) Implementation\n**Input:** {incoming}.\n\n"
            f"**Processing Steps:**\n1. Prepare {incoming.lower()}.\n"
            f"2. Apply the synthetic {name.lower()} module.\n"
            f"3. Record the demonstration interface.\n\n**Output:** {outgoing}.\n\n"
            "**Handoff:** Pass the output to the next module; labels are absent at inference."
        )
    sections.append(
        "### Datasets and Benchmark\n\n**Datasets**\n\n"
        "#### Dataset (1): [DEMO Synthetic Set](https://example.org/thainker-demo/dataset)\n"
        "**Usage Stage:** Simulated training.\n**Released Content:** Synthetic images and labels.\n"
        "**Usage Method:** No real dataset is downloaded.\n\n**Benchmarks**\n\n"
        "#### Benchmark (1): [DEMO Benchmark](https://example.org/thainker-demo/benchmark)\n"
        "**Task Type:** Segmentation.\n**Usage Mode:** Direct demonstration only.\n"
        "**Evaluation Method:** Aggregate six predetermined Dice values across three seeds.\n"
        "**Mapped Contributions:** Show all three contributions as a hypothetical pipeline.\n"
        "**Annotation Source:** Synthetic labels; no new doctor annotation.\n"
        "**Gaps and Handling:** This demonstration establishes no scientific claim.\n\n"
        "### Complete Implementation Process\n**Overall Mechanism:** Preserve, fuse, predict.\n"
        "**Data Preparation:** Load deterministic synthetic records.\n"
        "**End-to-End Steps:**\n1. Prepare the synthetic protocol.\n2. Simulate six runs.\n"
        "3. Aggregate results.\n4. Generate the demo manuscript and editable method figure.\n"
        "**Final Outputs:** Demonstration records and documents, not scientific evidence."
    )
    return "\n\n".join(sections) + "\n"


def evaluation(ids):
    from auto_search.web import serve as search

    return {
        "evaluations": [
            {
                "paper_id": key,
                "idea_title": f"模拟方案 {i + 1}：局部证据保留",
                "verdict": "promising",
                "scores": {
                    k: 5 if k == "annotation_compliance" else 4
                    for k in search.research_pipeline.SCORE_KEYS
                },
                "strengths": ["【模拟评审】模块接口清晰，可展示端到端交接。"],
                "major_risks": ["尚未运行真实实验，无法判断科学有效性。"],
                "required_revisions": ["正式使用时完成真实文献和数据核验。"],
                "rejection_reason": "DEMO: preset review, not an independent model judgment.",
                "literature_overlap_risk": "DEMO: novelty has not been established.",
            }
            for i, key in enumerate(ids)
        ],
        "ranking": ids,
        "portfolio_assessment": "【模拟评审】仅用于演示候选排序与人工选题。",
    }


def reference(index):
    key = f"DemoRef{index:02d}"
    return {
        "citation_key": key,
        "title": f"DEMO synthetic reference {index}: local visual evidence",
        "source_title": f"DEMO synthetic source {index}",
        "authors": "ThAInker Demo Team",
        "lead_author": "Demo Team",
        "year": 2026,
        "venue": "Synthetic demonstration, not a publication",
        "source_url": f"https://example.org/thainker-demo/reference-{index}",
        "doi": "",
        "bibtex": f"@misc{{{key}, title={{DEMO synthetic reference {index}}}, "
        "author={ThAInker Demo Team}, year={2026}, note={Fictional demo entry}}",
        "claim": "Synthetic context for the local evidence demonstration.",
        "evidence": "Preset demonstration text; no source was retrieved or verified.",
        "method_name": f"DemoMethod{index}",
        "mechanism": "A hypothetical local feature module for an engineering demonstration.",
        "development_role": "Demonstrates the literature-to-manuscript data interface only.",
    }


def intro_research():
    return {
        "research_direction": "DEMO local visual evidence preservation",
        "paragraph_1_evidence": [reference(i) for i in range(1, 4)],
        "paragraph_2_papers": [reference(i) for i in range(4, 8)],
        "synthesis_guidance": {
            "paragraph_1_logic": "Explain the engineering demo and synthetic scope.",
            "paragraph_2_logic": "Introduce hypothetical modules without novelty claims.",
            "transition_to_unresolved_challenge": "Real scientific validation remains required.",
        },
        "evidence_boundaries": [DISCLOSURE],
    }


def section(name):
    labels = {
        "intro": "Introduction",
        "related_work": "Related Work",
        "method": "Method",
        "experiments": "Experiments",
        "conclusion": "Conclusion",
    }
    body = {
        "intro": "This manuscript demonstrates the ThAInker research workflow using synthetic inputs. "
        "It illustrates how a proposed small-target recognition idea moves across modules.",
        "related_work": "All literature entries in this demo are explicitly fictional. "
        "They demonstrate data transport and citation formatting, not a literature review.",
        "method": METHOD,
        "experiments": "No training or GPU evaluation was conducted. Six predetermined synthetic Dice "
        "records demonstrate aggregation: baseline 0.79 and proposed 0.85, each with "
        "sample standard deviation 0.01 across three seeds. These are not measurements.",
        "conclusion": "The demo exercises software orchestration, file handoffs and document production. "
        "No result establishes scientific validity, novelty or real model performance.",
    }
    if name == "abstract":
        sentences = [
            "This manuscript presents a synthetic demonstration of the ThAInker research workbench, showing how an initial research direction moves through five connected software modules with explicit artifacts.",
            "The example studies a hypothetical small target recognition method in which local feature preservation, multi scale fusion and balanced training provide an understandable demonstration narrative for visitors.",
            "All literature cards and review judgments are preset fictional content, so the demonstration does not claim that any publication was retrieved, verified or assessed by a model.",
            "Instead of training on a server or allocating a graphics processor, a deterministic local simulator emits six predetermined result records for two variants and three seeds.",
            "The workbench checks record completeness and calculates means and sample standard deviations using its existing aggregation code, preserving the synthetic origin of every displayed number.",
            "The subsequent writing, table and figure stages create real editable source files, compile a manuscript and provide downloadable artifacts while retaining visible demonstration disclosures throughout the generated documents.",
            "Interactive selection, reference confirmation and pause or resume controls allow a presenter to explain the handoff boundaries and inspect outputs from the original module pages during a session.",
            "The demonstration validates software integration only and supplies no evidence about scientific novelty, medical usefulness, actual recognition performance or the effectiveness of the hypothetical method on real data.",
        ]
        return "\\begin{abstract}\n" + " ".join(sentences) + "\n\\end{abstract}"
    return f"\\section{{{labels[name]}}}\n\n{body[name]}\n"


def reference_result():
    scopes = (
        ["intro_p1"] * 3
        + ["intro_p2"] * 3
        + ["related_work"] * 6
        + ["experiments_datasets"] * 2
        + ["experiments_backbones"] * 2
        + ["experiments_baselines"] * 4
    )
    refs = [{**reference(i), "used_in": [scope]} for i, scope in enumerate(scopes, 1)]
    return {
        "references": refs,
        "bibtex": "\n\n".join(r["bibtex"] for r in refs),
        "updated_sections": {
            "intro": section("intro")
            + r" Synthetic context \cite{DemoRef01,DemoRef02,DemoRef03}."
            + "\n\n"
            + r"Fictional related modules \cite{DemoRef04,DemoRef05,DemoRef06}."
            + "\n\nNo scientific novelty or empirical effect has been established.",
            "related_work": section("related_work")
            + "\n"
            + "\n".join(
                f"\\subsection{{{title}}}\nDemonstration entries only "
                f"\\cite{{DemoRef{7 + i * 2:02d},DemoRef{8 + i * 2:02d}}}."
                for i, title in enumerate(RELATED_TITLES)
            ),
            "experiments": section("experiments")
            + "\n"
            + r"Synthetic datasets \cite{DemoRef13,DemoRef14}; hypothetical backbones "
            + r"\cite{DemoRef15,DemoRef16}; fictional baselines "
            + r"\cite{DemoRef17,DemoRef18,DemoRef19,DemoRef20}.",
        },
        "coverage": {
            **{
                scope: [r["citation_key"] for r in refs if scope in r["used_in"]]
                for scope in ("intro_p1", "intro_p2", "related_work")
            },
            **{
                scope: [
                    {
                        "target": f"DEMO {scope}",
                        "citation_keys": [r["citation_key"] for r in refs if scope in r["used_in"]],
                    }
                ]
                for scope in (
                    "experiments_datasets",
                    "experiments_backbones",
                    "experiments_baselines",
                )
            },
        },
        "evidence_boundaries": [DISCLOSURE],
    }


def manuscript_tex():
    updated = reference_result()["updated_sections"]
    return (
        r"\documentclass[11pt]{article}" + "\n"
        r"\usepackage[margin=22mm]{geometry}\usepackage{graphicx}\usepackage{fancyhdr}" + "\n"
        r"\pagestyle{fancy}\fancyhf{}\fancyhead[L]{ThAInker | SYNTHETIC DEMO}" + "\n"
        r"\fancyfoot[L]{No real training, literature search or scientific validation.}"
        r"\fancyfoot[R]{\thepage}\setlength{\headheight}{14pt}" + "\n"
        r"\title{Local Evidence Preservation\\\large ThAInker Synthetic Workflow Demonstration}"
        r"\author{ThAInker Demo}\date{}\begin{document}\maketitle" + "\n"
        r"\noindent\textbf{DEMO ONLY. All papers, reviews and experiment values are synthetic.}"
        + "\n"
        + section("abstract")
        + "\n"
        + updated["intro"]
        + "\n"
        + updated["related_work"]
        + "\n"
        + section("method")
        + "\n"
        + updated["experiments"]
        + "\n"
        + r"\begin{table}[ht]\centering\caption{Synthetic Dice values, not measured results.}"
        r"\label{tab:demo}\begin{tabular}{lcc}\hline Variant & Mean & Sample SD\\\hline "
        r"Baseline (synthetic) & 0.79 & 0.01\\Local evidence (synthetic) & 0.85 & 0.01\\"
        r"\hline\end{tabular}\end{table}"
        + "\n"
        + section("conclusion")
        + "\n"
        + r"\bibliographystyle{plain}\bibliography{references}\end{document}"
        + "\n"
    )
