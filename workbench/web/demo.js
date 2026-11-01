"use strict";
(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const stages = [
    ["search", "调研与选题", "Auto Search", "预置文献卡 → Weakness → 候选方案 → 选题。可以在原始模块查看完整 Idea。"],
    ["design", "实验与审计", "Auto Design", "执行本地 CPU 模拟器，生成六条预定记录。原有代码检查完整性并计算均值与样本标准差。"],
    ["writing", "论文与引用", "Auto Writing", "按真实依赖推进六章节、模拟参考文献与 LaTeX 排版；使用本机编译器生成真实 PDF。"],
    ["table", "表格与复核", "Auto Table", "接收论文副本，保留模拟数值与来源，再编译论文。复核响应为预置演示内容。"],
    ["figure", "主图与交付", "Auto Figure", "确认三张参考图后，使用预置模板生成可编辑主图，插入论文副本并重新编译。"],
  ];
  const labels = {running:"运行中", waiting_review:"等待确认", waiting_selection:"等待选题", paused:"已暂停", blocked:"等待恢复", completed:"演示已完成"};
  let busy = false, interactionKey = "", finishedKey = "", connectionError = false;
  async function api(path, data) {
    const response = await fetch(path, {cache:"no-store", ...(data === undefined ? {} : {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(data)})});
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || `HTTP ${response.status}`);
    return value;
  }
  function notice(message) { $("#notice").textContent = message; $("#notice").hidden = !message; }
  function render(data) {
    const f = data.flow, index = f ? stages.findIndex((s) => s[0] === f.stage) : -1;
    const completed = f?.status === "completed";
    const classification = (i) => completed || i < index ? "done" : i === index ? "current" : "pending";
    $("#flow-status").textContent = f ? labels[f.status] || f.status : "准备开始";
    $("#flow-status").className = `state-chip ${esc(f?.status || "")}`;
    $("#stage-nav").innerHTML = stages.map(([key, title], i) => `<a class="stage-nav-item ${classification(i)}" href="${esc(data.links[key] || "#progress-track")}"><i>${classification(i) === "done" ? "✓" : `0${i + 1}`}</i>${title}</a>`).join("");
    $("#progress-track").innerHTML = stages.map(([, title, module], i) => `<li class="${classification(i)}" ${i === index && !completed ? 'aria-current="step"' : ""}><i>${classification(i) === "done" ? "✓" : `0${i + 1}`}</i><strong>${title}</strong><small>${module}</small></li>`).join("");
    $("#setup").hidden = Boolean(f) && !completed;
    $("#run-controls").hidden = !f;
    $("#flow-message").textContent = f?.message || "";
    $("#pause").hidden = !f || !["running","waiting_review","waiting_selection"].includes(f.status);
    $("#resume").hidden = !f || !["paused","blocked"].includes(f.status);
    $("#restart").hidden = true;
    const current = stages[Math.max(0, index)];
    $("#stage-detail").innerHTML = `<p>${esc(completed ? "五个阶段已完成。所有演示产物均可下载；你也可以进入原始模块检查交接记录。" : current[3])}</p>${data.links[current[0]] ? `<a href="${esc(data.links[current[0]])}">进入 ${esc(current[2])} ↗</a>` : '<span class="mini-chip">每个模块独立可用</span>'}`;
    const nextInteraction = JSON.stringify([f?.status, data.candidates.map((c) => c.id), data.awaiting_references, data.references]);
    if (interactionKey !== nextInteraction) {
      interactionKey = nextInteraction;
      $("#interaction").hidden = true;
      if (f?.status === "waiting_selection") {
        $("#interaction").hidden = false;
        $("#interaction").innerHTML = `<p class="eyebrow">A HUMAN DECISION</p><h2>选择一个 Idea，继续研究。</h2><p>以下评分与结论均为模拟评审，展示选题与交接的交互。</p><div class="candidate-grid">${data.candidates.map((c, i) => `<article class="candidate"><span class="mini-chip">候选 0${i + 1} · 模拟</span><h3>${esc(c.idea_title || c.title || c.id)}</h3><p>${esc(c.review?.strengths?.[0] || "预置局部证据保留方案；未进行科学验证。")}</p><button class="primary" data-action="select" data-idea="${esc(c.id)}" ${c.eligible ? "" : "disabled"}>选择此方案 →</button></article>`).join("")}</div>`;
      } else if (data.awaiting_references && f?.status !== "paused") {
        $("#interaction").hidden = false;
        $("#interaction").innerHTML = `<p class="eyebrow">BEFORE THE FINAL FIGURE</p><h2>确认参考图，进入最后一个阶段。</h2><p>保留正式流程中的确认节点。本 Demo 主图由固定模板生成，参考图展示其真实交互入口。</p><div class="reference-grid">${data.references.map((r) => `<div><img src="${esc(r.url)}" alt="默认风格参考图 ${r.slot}"><p>参考图 0${r.slot}</p></div>`).join("")}</div><button class="primary" data-action="references">确认三张参考图并继续 →</button><a class="text-link" href="${esc(data.links.figure)}"> 在原始模块更换参考图 ↗</a>`;
      }
    }
    if (data.metrics.length) {
      $("#metrics").className = "";
      $("#metrics").innerHTML = `<table class="metric-table"><thead><tr><th>方法（模拟）</th><th>Dice 均值</th><th>样本标准差</th><th>种子数</th></tr></thead><tbody>${data.metrics.map((m) => `<tr><td>${m.variant_id === "ours" ? "局部证据保留" : "Baseline"}<span class="bar"><i style="width:${Math.max(0, Math.min(100, m.mean * 100))}%"></i></span></td><td>${Number(m.mean).toFixed(2)}</td><td>± ${Number(m.sample_std).toFixed(2)}</td><td>${m.n}</td></tr>`).join("")}</tbody></table><p class="metric-footnote">预定模拟值，仅检验汇总链路；不代表真实模型性能或提升。</p>`;
    } else {
      $("#metrics").className = "metrics-empty";
      $("#metrics").innerHTML = "<span>▥</span><p>实验阶段完成后，模拟数据会出现在这里。</p>";
    }
    if (Object.keys(data.links).length) {
      $("#artifacts").className = "";
      $("#artifacts").innerHTML = `<div class="artifact-links">${stages.filter(([k]) => data.links[k]).map(([k,,name]) => `<a href="${esc(data.links[k])}">${name} ↗</a>`).join("")}</div><ul class="artifact-list">${data.artifacts.map((a) => `<li><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.label)}<span>↓</span></a></li>`).join("")}</ul>`;
    } else {
      $("#artifacts").className = "artifacts-empty";
      $("#artifacts").innerHTML = "<p>运行后可打开原始模块，查看 Idea、实验记录、论文和主图。</p><div class='placeholder-files'><span>▤ Idea.md</span><span>▦ Results.json</span><span>▧ Paper.pdf</span></div>";
    }
    $("#delivery").hidden = !completed;
    if (completed && finishedKey !== f.id) {
      finishedKey = f.id;
      $("#figure-preview").src = data.figure_preview;
      $("#figure-link").href = data.links.figure;
      $("#downloads").innerHTML = data.artifacts.filter((a) => a.kind === "pdf").map((a) => `<a class="primary" href="${esc(a.url)}" target="_blank" rel="noopener">打开演示论文 PDF ↗</a>`).join("") + `<a class="text-link" style="color:#c4d9b8" href="${esc(data.links.figure)}">查看全部交付 ↗</a>`;
    }
    const events = f?.events || [];
    $("#event-count").textContent = String(events.length);
    $("#timeline").innerHTML = [...events].reverse().map((e) => `<li><time>${esc(new Date(e.at).toLocaleTimeString("zh-CN", {hour12:false}))}</time><span>${esc(e.message)}</span></li>`).join("");
  }
  async function refresh() {
    try {
      const data = await api("/api/demo");
      $("#connection").textContent = "演示服务已连接";
      if (connectionError) { notice(""); connectionError = false; }
      render(data);
    } catch (error) {
      $("#connection").textContent = "演示服务未连接";
      connectionError = true;
      notice("请先在项目目录运行 .venv/bin/python -m workbench.demo --port 8769，再打开本页。" + (error.message.includes("JSON") ? "" : ` ${error.message}`));
    } finally { window.setTimeout(refresh, 1200); }
  }
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || busy) return;
    busy = true; button.disabled = true; notice("");
    try {
      const action = button.dataset.action;
      const payload = action === "start" ? {selection:$("#selection").value, fail_once:$("#fail-once").checked} : action === "select" ? {idea_id:button.dataset.idea} : {};
      render(await api(`/api/demo/${action}`, payload));
    } catch (error) { notice(error.message); }
    finally { busy = false; button.disabled = false; }
  });
  if (location.protocol === "file:") notice("请从 http://127.0.0.1:8769/demo.html 打开演示。");
  else refresh();
})();
