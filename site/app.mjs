import { STAGES, LABELS, createDemo, transition } from "./flow.mjs";

const $ = (selector) => document.querySelector(selector);
const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
let flow = createDemo(), timer, chapter = "Method", tableStyle = "standard";
let active = location.hash.slice(1) || "overview";
const refs = [true, true, true], uploaded = {};
const moduleTabs = { search: "ideas", design: "protocol", writing: "manuscript", table: "table", figure: "references" };
const captions = {
  intro: "A synthetic study of small-target visual recognition. No real publication was retrieved or verified.",
  method: "The hypothetical encoder preserves high-resolution residual features. A fusion module combines local and global evidence before prediction. Balanced sampling is used only during training; inference never reads labels.",
  results: "Six predetermined Dice values illustrate two variants and three seeds. Baseline: 0.79 ± 0.01. Local evidence: 0.85 ± 0.01. These are synthetic values, not model measurements.",
};
const checkpoints = {
  search: ["选题由你决定，也可交给自动排序", "可选人工接入", "检查论文与 Weakness 的证据，选择一个 Idea，或标记通过 / 废弃。自动模式只采用 promising 且未被人工废弃的首选。", "选择后保留 Idea、来源与评审交接记录。"],
  design: ["方法改变之前，先看具体提案", "条件触发 · 必须审批", "普通执行故障在原科学边界内处理。一旦需要方法修改，系统提交完整提案和 Revision ID；批准、拒绝或结束当前 Idea 由你决定。", "批准只授权匹配的 Revision ID，恢复说明不能替代方法批准。"],
  writing: ["你的材料，决定写作的证据边界", "可选人工接入", "补充或替换实验说明、支持文档，上传 LaTeX 模板；可以逐步触发写作，也可以自动推进。失败时继续当前步骤。", "输入变化会使受影响的下游内容失效；PDF 可单独重编译。"],
  table: ["提出排版反馈，保留科学口径", "可选人工接入", "选择输入和配置、提交排版要求；复核未通过时给出反馈，同一任务进入下一轮。编译失败可以复用已完成源码。", "排版修改不应更改原数值、方法名、来源或 N/A / INCOMPLETE。"],
  figure: ["开始绘图前，由作者确认参考", "必须人工确认", "逐张选择默认参考或上传自己的三张图片，确认后实际系统才启动绘图；可以修改要求、停止或恢复，并重试复核。", "参考图提供视觉表达；不能把别人的科学方法引入本论文。"],
};
const stageDescription = {
  search: "从方向到可检验的候选方案。保留论文、Weakness、成因、Contribution、方法和评审。",
  design: "从科学约束到实验方案、执行记录与结果审计。需要时做 R0，方法修改保留明确审批边界。",
  writing: "承接完成且通过检查的实验资料，按依赖顺序完成文献调研、六章节、引用和 LaTeX。",
  table: "接续完整论文或实验数据，整理表格、保持原始数值，并编译和复核完整 PDF。",
  figure: "接续表格复核后的论文副本，确认参考、生成可编辑主图、局部插图并交付最终论文。",
};
const downloads = [
  ["PDF", "完整演示论文", "预先真实编译的模拟论文，含方法图、表格与 DEMO 标记。", "demo-paper.pdf"],
  ["PPTX", "可编辑方法主图", "预置模板生成的原生形状与文本；展示可编辑交付形式。", "demo-method.pptx"],
  ["ZIP", "论文 LaTeX 源码", "经过筛选的模拟源码与主图资源，保留演示说明。", "demo-source.zip"],
  ["CSV", "逐 seed 模拟数据", "两种方法、三个种子。每一行都标记 simulation=true。", "synthetic-results.csv"],
  ["ZIP", "示例交付包", "论文、主图、模拟数据与说明；不包含任何运行日志或本地路径。", "demo-deliverables.zip"],
];

function humanPanel(id) {
  const [title, type, copy, rule] = checkpoints[id];
  return `<aside class="human-panel"><span class="human-chip ${id === "design" || id === "figure" ? "required" : ""}">◎ ${type}</span><h3>${title}</h3><p>${copy}</p><p class="rule">${rule}</p><a class="text-link" href="#human">查看人工介入地图 →</a></aside>`;
}

function tabs(id, list) {
  return `<nav class="module-subnav" aria-label="${escape(id)} 视图">${list.map(([key, label]) => `<button class="tab ${moduleTabs[id] === key ? "active" : ""}" data-module="${id}" data-tab="${key}" aria-pressed="${moduleTabs[id] === key}">${label}</button>`).join("")}</nav>`;
}

function syntheticTable(raw = false) {
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>方法 · 模拟</th>${raw ? "<th>Seed 1</th><th>Seed 2</th><th>Seed 3</th>" : ""}<th>Dice 均值</th><th>样本 SD</th></tr></thead><tbody><tr><td>Baseline</td>${raw ? "<td>0.78</td><td>0.79</td><td>0.80</td>" : ""}<td>0.79</td><td>0.01</td></tr><tr><td>Local evidence</td>${raw ? "<td>0.84</td><td>0.85</td><td>0.86</td>" : ""}<td>0.85</td><td>0.01</td></tr></tbody></table></div><p class="fine-print">预定模拟值，不是训练结果。本静态站点展示已计算的示例汇总；不在浏览器执行科研实验。</p>`;
}

function searchView() {
  const tab = moduleTabs.search;
  const data = [
    ["local", "局部证据保留", "以高分辨率残差路径保留小目标细节，再与全局特征融合。", "DEMO-C1 · 保留细节 / DEMO-C2 · 融合尺度 / DEMO-C3 · 平衡训练"],
    ["scale", "尺度感知的特征读取", "用一个假设性尺度选择器演示另一条候选分支；未验证新颖性或效果。", "DEMO-S1 · 选择尺度 / DEMO-S2 · 读取局部 / DEMO-S3 · 固定评测"],
  ];
  let body;
  if (tab === "papers") body = `<h2>模拟论文卡</h2>${[1, 2].map(i => `<article class="paper-card"><span class="paper-meta">FICTIONAL SOURCE · DEMO ${i} · 2026</span><h3>Synthetic study of local visual evidence</h3><p>【模拟 Weakness】小目标细节可能在降采样与全局聚合中稀释。</p><p>证据说明：预置示例，不对应真实论文发现；example.org 链接仅表示来源字段的结构。</p><span class="human-chip">人工入口：核验来源、标记通过或废弃</span></article>`).join("")}`;
  else if (tab === "review") body = `<h2>预置评审示例</h2><p>实际系统独立评审候选 Idea；本页评分和 promising 结论均为预置内容。</p><div class="stats-row"><div class="stat"><strong>2</strong><span>模拟候选</span></div><div class="stat"><strong>4 / 5</strong><span>预置可行性评分</span></div><div class="stat"><strong>未验证</strong><span>新颖性与真实效果</span></div></div><ul class="audit-list"><li>保留支持证据与反证线索</li><li>核查公开 Benchmark 与标签可用性</li><li>记录文献重合风险和必要修订</li></ul>`;
  else body = `<h2>两个候选，交给研究者选择。</h2>${data.map(([id, name, copy, claims], i) => `<article class="paper-card"><span class="paper-meta">IDEA 0${i + 1} · SYNTHETIC</span><h3>${name}${flow.candidate === id ? " · 已选择" : ""}</h3><p>${copy}</p><p class="fine-print">${claims}</p><div class="button-row"><span class="pill">promising · 模拟评审</span><button class="secondary" data-action="select" data-id="${id}" ${flow.status === "waiting_selection" ? "" : "disabled"}>选择这个 Idea →</button></div></article>`).join("")}<p class="fine-print">尚未开始导览时可浏览快照；开始后停在人工选题节点，即可体验选择。</p>`;
  return tabs("search", [["papers", "论文与证据"], ["ideas", "Weakness → Idea"], ["review", "评审与人工核验"]]) + `<div class="module-layout"><section class="panel">${body}</section>${humanPanel("search")}</div>`;
}

function revision() {
  return `<div class="revision"><span class="human-chip required">条件触发 · 必须匹配提案审批</span><h3>DEMO-MR-01 · 方法修改提案</h3><p><strong>模拟断点：</strong>原融合路径超出演示资源约束。拟改为共享编码器 + 轻量融合层；这属于方法变化，不能当作普通恢复直接实施。</p><p><strong>影响边界：</strong>重新检查受影响设计、实现与实验；保留既有记录。此提案仅用于说明审批交互。</p><div class="button-row"><button class="primary" data-action="approve" ${flow.status === "waiting_revision" ? "" : "disabled"}>批准 DEMO-MR-01</button><button class="secondary" data-action="reject" ${flow.status === "waiting_revision" ? "" : "disabled"}>暂不批准</button><button class="soft-button" data-action="abandon" ${flow.status === "waiting_revision" ? "" : "disabled"}>结束当前 Idea</button></div></div>`;
}

function designView() {
  let body;
  if (moduleTabs.design === "approval") body = `<h2>方法修改，要有一次明确决定。</h2><p>只有触发方法修改才需要此审批。实际系统保留 Revision ID 和决定；刷新或恢复不能自动覆盖拒绝。</p>${revision()}`;
  else if (moduleTabs.design === "results") body = `<h2>原始数据 → 汇总 → 诊断</h2>${syntheticTable(true)}<pre class="code">schema_version: 1.0\nsimulation: true\nvariants: [baseline, ours]\nseeds: [1, 2, 3]\nrecords: 6\nautomatic_claim_verdict: NOT_ASSIGNED</pre><a class="text-link" href="downloads/synthetic-results.csv" download>下载模拟逐 seed 数据 ↓</a>`;
  else body = `<h2>先锁定科学意图，再执行。</h2><ul class="claim-list"><li><b>INPUT</b><span>保留 Motivation、Contribution、用户给定 Benchmark 与资源约束。</span></li><li><b>DESIGN</b><span>贡献对应实验、基线、消融和证据；需要时先运行 R0。</span></li><li><b>RUN</b><span>真实系统执行注册命令、记录在途任务、原始结果与失败现场。</span></li><li><b>AUDIT</b><span>完成状态、结果完整性与审计检查通过，才交接正式写作。</span></li></ul><pre class="code">Design → [R0 when required] → Run\n                     ↑             ↓\n             method approval ← Diagnosis\n                                   ↓\n                           Integrity audit</pre><p class="fine-print">当前浏览器不执行上述命令。此处展示实际系统的流程边界，导览使用模拟状态。</p>`;
  return tabs("design", [["protocol", "设计与执行"], ["results", "模拟结果"], ["approval", "人工审批"]]) + `<div class="module-layout"><section class="panel">${body}</section>${humanPanel("design")}</div>`;
}

function writingView() {
  const prose = { Introduction: captions.intro, "Related Work": "All references in this sample are explicitly fictional. They show citation formatting and data handoffs, not a real review of the literature.", Method: captions.method, Experiments: captions.results, Conclusion: "This demonstration illustrates integration and artifact delivery. It establishes no scientific novelty, empirical improvement or clinical usefulness.", Abstract: "A synthetic demonstration connects research direction, idea selection, experimental records, manuscript writing, tables and an editable figure. The sample illustrates the software workflow only; all research content is simulated." };
  let body;
  if (moduleTabs.writing === "inputs") body = `<h2>把你的资料接进来。</h2><ul class="claim-list"><li><b>01</b><span>实验说明与真实结果产物：写作的主要证据来源。</span></li><li><b>02</b><span>补充文档与文献：修改输入会标记受影响章节和出版产物失效。</span></li><li><b>03</b><span>LaTeX 模板 ZIP：可提前提供，也可后续替换并重新排版。</span></li></ul><label class="field">模板选择（浏览器内示意）<select id="template-select"><option>通用 article</option><option>自有 LaTeX 模板（需本地工作台上传）</option></select></label><p class="fine-print">本静态页面不接收或上传实验文件。完整输入管理请在本地工作台操作。</p>`;
  else if (moduleTabs.writing === "publication") body = `<h2>从章节到可编辑论文工程。</h2><pre class="code">Introduction research → Introduction\nRelated Work plan → Research → Related Work\nMethod → Experiments → Conclusion → Abstract\nReferences → LaTeX → PDF</pre><ul class="audit-list"><li>按依赖推进，失败保留已有章节</li><li>参考文献插入与最终引用整理</li><li>可独立重编译已有 PDF 源码</li></ul><a class="secondary" href="downloads/demo-paper.pdf" target="_blank" rel="noopener">打开预生成模拟论文 ↗</a>`;
  else body = `<h2>六个章节，沿同一条证据链展开。</h2><div class="chapter-tabs" aria-label="论文章节">${Object.keys(prose).map(name => `<button data-chapter="${name}" class="${chapter === name ? "active" : ""}" aria-pressed="${chapter === name}">${name}</button>`).join("")}</div><article class="manuscript"><div class="watermark">THAINKER · SYNTHETIC MANUSCRIPT PREVIEW</div><h3>${chapter}</h3><p>${prose[chapter]}</p><p>No real training, literature verification or scientific validation was performed for this demonstration.</p></article>`;
  return tabs("writing", [["manuscript", "六章节预览"], ["inputs", "人工输入与模板"], ["publication", "引用与出版"]]) + `<div class="module-layout"><section class="panel">${body}</section>${humanPanel("writing")}</div>`;
}

function tableView() {
  let body;
  if (moduleTabs.table === "review") body = `<h2>复核不通过，可以带着反馈继续。</h2><ul class="audit-list"><li>保留原始数值、均值与样本标准差</li><li>保留方法名、label、引用与来源</li><li>实际系统检查完整 PDF 的全部页面</li></ul><label class="field">试着写一条排版反馈（仅当前浏览器）<textarea id="table-feedback" rows="3" placeholder="例如：突出主结果，保留所有逐 seed 数据来源。"></textarea></label><button class="secondary" data-feedback>保存演示反馈</button><p class="fine-print">静态页面仅显示反馈交互，不触发实际重设计、编译或模型复核。</p>`;
  else if (moduleTabs.table === "source") body = `<h2>原数值保留，输出可编辑源码。</h2><pre class="code">% DEMO / SYNTHETIC — not measured results\n\\begin{tabular}{lcc}\nMethod &amp; Mean Dice &amp; Sample SD \\\\\nBaseline &amp; 0.79 &amp; 0.01 \\\\\nLocal evidence &amp; 0.85 &amp; 0.01 \\\\\n\\end{tabular}</pre><a class="text-link" href="downloads/demo-source.zip" download>下载预生成模拟 LaTeX 工程 ↓</a>`;
  else body = `<h2>让表格讲清楚比较关系。</h2><p>切换查看汇总或逐种子口径；数值始终保持一致。</p><div class="view-options"><button data-table-style="standard" class="${tableStyle === "standard" ? "active" : ""}">汇总表</button><button data-table-style="seeds" class="${tableStyle === "seeds" ? "active" : ""}">逐种子视图</button></div>${syntheticTable(tableStyle === "seeds")}<div class="file-chips"><span>原始数据</span><span>替换源码</span><span>PDF 预览</span><span>复核意见</span></div>`;
  return tabs("table", [["table", "实验表格"], ["source", "LaTeX 源码"], ["review", "人工反馈"]]) + `<div class="module-layout"><section class="panel">${body}</section>${humanPanel("table")}</div>`;
}

function figureView() {
  let body;
  if (moduleTabs.figure === "preview") body = `<h2>方法要清楚，主图要可编辑。</h2><img class="figure-image" src="media/method-preview.png" alt="模拟方法图：输入、局部编码器、多尺度融合和预测头"><p class="fine-print">此主图由离线演示固定模板预先生成。静态浏览不运行 FigureCrafter、不重新生成图片。</p><div class="button-row"><a class="secondary" href="downloads/demo-method.pptx" download>下载可编辑示例 PPTX ↓</a><a class="text-link" href="#delivery">查看完整交付 →</a></div>`;
  else if (moduleTabs.figure === "handoff") body = `<h2>在论文副本中插图，保留上游来源。</h2><pre class="code">AutoTable ready\n  → copy manuscript ZIP / PDF\n  → confirm 3 references [human]\n  → plan / generate / patch\n  → compile / full-page review\n  → editable figure + manuscript</pre><p>实际系统保存来源轮次和哈希。上游论文改变会使旧图失效；单独绘图失败不会重跑此前全部研究阶段。</p><p class="fine-print">本页下载的示例文件预先生成，不会因为本次按钮点击而变化。</p>`;
  else body = `<h2>三张参考，先由作者确认。</h2><p>默认参考仅用于展示确认流程。也可在当前浏览器预览本地图片，文件不上传。</p><div class="references-grid">${[0, 1, 2].map(i => `<div class="ref-card"><img src="${uploaded[i] || `media/reference-${i + 1}.png`}" alt="风格参考图 ${i + 1}"><label><input type="checkbox" data-ref="${i}" ${refs[i] ? "checked" : ""}>参考图 0${i + 1}</label><label class="file-ref">本地预览<input type="file" data-upload-ref="${i}" accept="image/png,image/jpeg" aria-label="预览参考图 ${i + 1}" style="font-size:9px;max-width:100%"></label></div>`).join("")}</div><button class="primary" data-action="references" ${flow.status === "waiting_references" ? "" : "disabled"}>确认三张参考图并继续 →</button><p class="fine-print">开始导览并到达第五阶段后，此确认按钮可用。实际系统在作者确认后才启动绘图。</p>`;
  return tabs("figure", [["references", "参考图确认"], ["preview", "可编辑主图"], ["handoff", "论文整合"]]) + `<div class="module-layout"><section class="panel">${body}</section>${humanPanel("figure")}</div>`;
}

function renderHuman() {
  $("#human-screen").innerHTML = `<header class="module-heading"><div><p class="eyebrow">HUMAN IN THE LOOP</p><h1>过程自动衔接，关键决定由你掌舵。</h1><p>以下标注对应完整系统的实际入口。静态导览展示其中的选题、方法审批、故障恢复与参考图确认。</p></div><span class="pill">◎ 人工介入地图</span></header><div class="human-map">${STAGES.map(s => `<article class="human-panel"><span class="panel-label">${s.name.toUpperCase()}</span><span class="human-chip ${["design", "figure"].includes(s.id) ? "required" : ""}">${checkpoints[s.id][1]}</span><h3>${checkpoints[s.id][0]}</h3><p>${checkpoints[s.id][2]}</p><p class="rule">${checkpoints[s.id][3]}</p><a class="text-link" href="#${s.id}">查看模块入口 →</a></article>`).join("")}<article class="human-panel"><span class="panel-label">ACROSS THE JOURNEY</span><span class="human-chip">跨阶段 · 可选接入</span><h3>随时查看、暂停和接续。</h3><p>查看日志和已保存产物；从已有任务接续流程；暂停后继续原步骤。服务重启后由用户显式恢复，避免自动重复执行。</p><p class="rule">停止实验控制器不等于远端训练已经停止；恢复前仍需核对在途执行。</p></article></div><section class="human-global"><h2>自动化不能把这些边界抹掉。</h2><p>没有合格选题不会强行继续；方法修改不能用普通“继续”替代批准；未完成实验不能作为正式论文证据；参考图未确认不自动绘图。</p></section>`;
}

function renderDelivery() {
  $("#delivery-screen").innerHTML = `<header class="module-heading"><div><p class="eyebrow">THE JOURNEY, DELIVERED</p><h1>带走产物，也带走清晰的来源边界。</h1><p>以下是离线演示预先生成的公开样例。全部明确标注为模拟内容，与本次浏览器状态无关。</p></div><span class="pill">PREGENERATED SAMPLES</span></header><div class="downloads">${downloads.map(([type, title, copy, file]) => `<article class="download-card"><span class="file-icon">${type}</span><h3>${title}</h3><p>${copy}</p><a href="downloads/${file}" ${type === "PDF" ? 'target="_blank" rel="noopener"' : "download"}>${type === "PDF" ? "打开示例 ↗" : "下载示例 ↓"}</a></article>`).join("")}</div><div class="delivery-preview"><section class="panel"><h2>主图预览</h2><img class="figure-image" src="media/method-preview.png" alt="可编辑模拟方法主图预览"><p class="fine-print">模板生成。下载 PPTX 可编辑原生模块、文字与连线。</p></section><section class="panel"><h2>复现完整软件链路</h2><p>GitHub Pages 只展示交互。需要真实任务调度、文件校验、编译与下载验收时，可运行本地离线模式。</p><pre class="code">uv venv --python 3.12 .venv\nuv pip install --python .venv/bin/python -e '.[demo]'\n.venv/bin/python -m workbench.demo --port 8769</pre><a class="text-link" href="https://github.com/goya4140/ThAInker/blob/main/docs/DEMO.zh-CN.md">阅读本地演示说明 ↗</a></section></div>`;
}

function renderGuide() {
  $("#guide-status").textContent = LABELS[flow.status];
  $("#guide-status").className = `pill ${flow.status}`;
  $("#guide-setup").hidden = !["idle", "completed", "abandoned"].includes(flow.status);
  $("#guide-progress").innerHTML = STAGES.map((s, i) => `<li class="${flow.done.includes(s.id) ? "done" : flow.status !== "idle" && flow.stage === i ? "current" : ""}"><i>${flow.done.includes(s.id) ? "✓" : `0${i + 1}`}</i>${s.title}</li>`).join("");
  const messages = {
    idle: "选择你想体验的人工介入场景，开始一次浏览器内导览。也可以直接浏览各模块示例。",
    running: `正在演示 ${STAGES[flow.stage].name} 的交接；此状态由浏览器模拟，不表示后台任务执行。`,
    waiting_selection: "请在 Auto Search 选择一个候选 Idea。该人工入口在完整系统中可选，也可使用自动选题。",
    waiting_revision: "已模拟触发方法修改。必须明确批准当前 DEMO-MR-01；普通继续不能替代批准。",
    waiting_references: "请在 Auto Figure 确认三张参考图。真实绘图在此确认之后启动。",
    paused: "演示已暂停。继续后恢复此前等待状态，人工审批和参考图确认仍然有效。",
    blocked: "已模拟一次写作步骤中断。点击继续，演示保留此前阶段并恢复当前步骤。",
    completed: "五阶段导览完成。可以下载预生成样例，或重新体验其他人工介入场景。",
    abandoned: "你结束了当前演示 Idea。该决定不会被自动推进覆盖，可重新开始一次导览。",
  };
  $("#guide-message").textContent = messages[flow.status];
  let controls = "";
  if (["running", "waiting_selection", "waiting_revision", "waiting_references"].includes(flow.status)) controls += '<button class="secondary" data-action="pause">暂停导览</button>';
  if (["paused", "blocked"].includes(flow.status)) controls += '<button class="primary" data-action="resume">继续当前步骤 →</button>';
  if (["waiting_selection", "waiting_revision", "waiting_references"].includes(flow.status)) controls += `<a class="text-link" href="#${STAGES[flow.stage].id}">打开当前人工接入节点 ↗</a>`;
  if (flow.status === "completed") controls += '<a class="primary" href="#delivery">查看示例交付 →</a>';
  $("#guide-controls").innerHTML = controls;
  $("#event-count").textContent = String(flow.events.length);
  $("#events").innerHTML = [...flow.events].reverse().map(e => `<li><time>${escape(new Date(e.at).toLocaleTimeString("zh-CN", {hour12:false}))}</time><span>${escape(e.message)}</span></li>`).join("");
}

function render() {
  const screens = ["overview", "human", "delivery", ...STAGES.map(s => s.id)];
  if (!screens.includes(active)) active = "overview";
  $("#navigation").innerHTML = `<a class="nav-link ${active === "overview" ? "active" : ""}" href="#overview"><span>◈</span>全流程概览</a>${STAGES.map((s, i) => `<a class="nav-link ${active === s.id ? "active" : ""}" href="#${s.id}"><span>${flow.done.includes(s.id) ? "✓" : `0${i + 1}`}</span>${s.title}<small>${s.name.replace("Auto ", "")}</small></a>`).join("")}<div class="nav-divider"></div><a class="nav-link ${active === "human" ? "active" : ""}" href="#human"><span>◎</span>人工介入地图</a><a class="nav-link ${active === "delivery" ? "active" : ""}" href="#delivery"><span>↧</span>示例交付</a>`;
  $("#breadcrumb").textContent = STAGES.find(s => s.id === active)?.name || {overview:"全流程概览", human:"人工介入地图", delivery:"示例交付"}[active];
  $("#overview-screen").hidden = active !== "overview";
  $("#module-screen").hidden = !STAGES.some(s => s.id === active);
  $("#human-screen").hidden = active !== "human";
  $("#delivery-screen").hidden = active !== "delivery";
  const stage = STAGES.find(s => s.id === active);
  if (stage) {
    $("#module-screen").innerHTML = `<header class="module-heading"><div><p class="eyebrow">0${STAGES.indexOf(stage) + 1} / ${stage.name.toUpperCase()}</p><h1>${stage.verb}</h1><p>${stageDescription[active]}</p></div><span class="pill">预置示例快照 · 模拟内容</span></header>${({search:searchView, design:designView, writing:writingView, table:tableView, figure:figureView})[active]()}`;
  }
  if (active === "human") renderHuman();
  if (active === "delivery") renderDelivery();
  renderGuide();
}

$("#stage-cards").innerHTML = STAGES.map((s, i) => `<a class="stage-card" href="#${s.id}"><div class="stage-number">0${i + 1}<span>↗</span></div><h3>${s.title}</h3><div class="english">${s.name}</div><p>${s.verb}</p><span class="human-chip ${[1, 4].includes(i) ? "required" : ""}">${s.human}</span></a>`).join("");

function schedule() {
  clearTimeout(timer);
  if (flow.status === "running") timer = setTimeout(() => act("advance"), 1600);
}

function act(action, payload = {}) {
  try {
    flow = transition(flow, action, payload);
    if (["start", "advance", "resume", "select", "approve", "references"].includes(action) && !["idle", "completed", "abandoned"].includes(flow.status)) {
      active = STAGES[flow.stage].id;
      if (flow.status === "waiting_revision") moduleTabs.design = "approval";
      if (flow.status === "waiting_references") moduleTabs.figure = "references";
      if (flow.status === "waiting_selection") moduleTabs.search = "ideas";
      if (location.hash.slice(1) !== active) location.hash = active;
    }
    $("#toast").hidden = true;
    render();
    schedule();
  } catch (error) {
    $("#toast").textContent = error.message;
    $("#toast").hidden = false;
  }
}

document.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button || button.disabled) return;
  if (button.dataset.action) {
    const action = button.dataset.action;
    const payload = action === "start" ? {manual:$("#manual-choice").checked, revision:$("#revision-choice").checked, failure:$("#failure-choice").checked}
      : action === "select" ? {id:button.dataset.id} : action === "approve" ? {revision:"DEMO-MR-01"} : action === "references" ? {slots:refs} : {};
    act(action, payload);
  } else if (button.dataset.tab) { moduleTabs[button.dataset.module] = button.dataset.tab; render(); }
  else if (button.dataset.chapter) { chapter = button.dataset.chapter; render(); }
  else if (button.dataset.tableStyle) { tableStyle = button.dataset.tableStyle; render(); }
  else if (button.hasAttribute("data-feedback")) {
    const note = $("#table-feedback").value.trim();
    $("#toast").textContent = note ? "反馈已在当前演示中确认；没有上传，也没有触发真实重设计。" : "请先填写一条演示反馈。";
    $("#toast").hidden = false;
  }
});

document.addEventListener("change", async event => {
  const input = event.target;
  if (input.hasAttribute("data-ref")) refs[Number(input.dataset.ref)] = input.checked;
  if (input.hasAttribute("data-upload-ref") && input.files?.[0]) {
    const file = input.files[0];
    if (!["image/png", "image/jpeg"].includes(file.type) || file.size > 6 * 1024 * 1024) {
      $("#toast").textContent = "请选择不超过 6 MB 的 PNG 或 JPEG；文件只在本浏览器预览。";
      $("#toast").hidden = false;
      return;
    }
    const key = Number(input.dataset.uploadRef);
    if (uploaded[key]) URL.revokeObjectURL(uploaded[key]);
    uploaded[key] = URL.createObjectURL(file);
    render();
  }
});
window.addEventListener("hashchange", () => { active = location.hash.slice(1) || "overview"; render(); window.scrollTo({top:0, behavior:"instant"}); });
render();
