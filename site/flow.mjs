// Browser-only demonstration. No service, model, training or compiler is invoked.
export const STAGES = [
  { id: "search", name: "Auto Search", title: "调研与选题", verb: "找到值得验证的问题", human: "可选 · 人工选题与核验" },
  { id: "design", name: "Auto Design", title: "实验与审计", verb: "让贡献对应可检验的实验", human: "条件必需 · 方法修改审批" },
  { id: "writing", name: "Auto Writing", title: "论文与引用", verb: "让每个论述有据可依", human: "可选 · 补充材料与模板" },
  { id: "table", name: "Auto Table", title: "表格与复核", verb: "让结果完整而清楚", human: "可选 · 排版反馈与重试" },
  { id: "figure", name: "Auto Figure", title: "主图与交付", verb: "把方法变成可编辑的图", human: "必需 · 参考图确认" },
];

export const LABELS = { idle: "等待开始", running: "演示推进中", paused: "演示已暂停", waiting_selection: "等待人工选题", waiting_revision: "等待方法审批", waiting_references: "等待参考图确认", blocked: "体验故障恢复", completed: "演示已完成", abandoned: "本次演示已结束" };

export function createDemo() {
  return { stage: 0, status: "idle", done: [], candidate: null, approved: false,
    referencesConfirmed: false, failureInjected: false, events: [],
    options: { manual: true, revision: true, failure: true } };
}

function event(state, message) {
  state.events.push({ stage: STAGES[state.stage].id, message, at: new Date().toISOString() });
}

export function transition(previous, action, payload = {}) {
  const state = structuredClone(previous);
  if (action === "start") {
    if (!["idle", "completed", "abandoned"].includes(state.status)) throw new Error("请先完成或继续当前演示。");
    const fresh = createDemo();
    fresh.options = { ...fresh.options, ...payload };
    fresh.status = "running";
    event(fresh, "开始静态交互演示；所有过程状态与研究内容均为预置模拟。");
    return fresh;
  }
  if (action === "pause") {
    if (!["running", "waiting_selection", "waiting_revision", "waiting_references"].includes(state.status)) throw new Error("当前无需暂停。");
    state.resumeStatus = state.status;
    state.status = "paused";
    event(state, "已暂停演示。实际系统在各模块的安全边界保存进度。");
  } else if (action === "resume") {
    if (!["paused", "blocked"].includes(state.status)) throw new Error("当前无需继续。");
    state.status = state.status === "paused" ? state.resumeStatus : "running";
    event(state, "继续原演示步骤，保留此前阶段；不会绕过人工确认。");
  } else if (action === "select") {
    if (state.status !== "waiting_selection" || !["local", "scale"].includes(payload.id)) throw new Error("请在选题节点选择一个模拟方案。");
    state.candidate = payload.id;
    state.status = "running";
    event(state, "已人工选定模拟 Idea；交接保留 Motivation、Contribution 与来源。");
  } else if (action === "approve") {
    if (state.status !== "waiting_revision" || payload.revision !== "DEMO-MR-01") throw new Error("批准必须对应当前 Revision ID。");
    state.approved = true;
    state.status = "running";
    event(state, "已明确批准 DEMO-MR-01。真实流程只授权匹配的提案。");
  } else if (action === "reject") {
    if (state.status !== "waiting_revision") throw new Error("当前没有待审批的方法修改。");
    state.resumeStatus = "waiting_revision";
    state.status = "paused";
    event(state, "已拒绝本次提案，演示暂停；自动推进不能覆盖拒绝。");
  } else if (action === "abandon") {
    if (state.status !== "waiting_revision") throw new Error("请先查看当前提案。");
    state.status = "abandoned";
    event(state, "人工结束当前 Idea。实际系统保留失败尝试与既有产物。");
  } else if (action === "references") {
    if (state.status !== "waiting_references" || payload.slots?.length !== 3 || !payload.slots.every(Boolean)) throw new Error("请确认三张参考图。");
    state.referencesConfirmed = true;
    state.status = "running";
    event(state, "三张参考图已由作者确认。静态版本仅展示确认交互。");
  } else if (action === "advance") {
    if (state.status !== "running") return previous;
    if (state.stage === 0 && state.options.manual && !state.candidate) {
      state.status = "waiting_selection";
      event(state, "可选人工接入：本次导览使用手动选题；实际系统也支持自动采用 promising 首选。");
    } else if (state.stage === 1 && state.options.revision && !state.approved) {
      state.status = "waiting_revision";
      event(state, "条件审批：演示触发方法修改。未经当前提案批准不得继续实施。");
    } else if (state.stage === 2 && state.options.failure && !state.failureInjected) {
      state.failureInjected = true;
      state.status = "blocked";
      event(state, "模拟 Method 步骤中断。点击继续体验同任务恢复，不重做已完成阶段。");
    } else if (state.stage === 4 && !state.referencesConfirmed) {
      state.status = "waiting_references";
      event(state, "必需人工确认：作者确认三张参考图后，实际系统才启动绘图。");
    } else {
      if (state.stage === 0 && !state.candidate) state.candidate = "local";
      state.done.push(STAGES[state.stage].id);
      event(state, `${STAGES[state.stage].name} 演示阶段结束；显示预置示例产物。`);
      if (state.stage === 4) state.status = "completed";
      else state.stage += 1;
    }
  } else throw new Error("未知演示动作。");
  return state;
}
