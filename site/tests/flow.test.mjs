import test from "node:test";
import assert from "node:assert/strict";
import { createDemo, transition } from "../flow.mjs";

test("browsing creates no running task, and advancing idle does nothing", () => {
  const state = createDemo();
  assert.equal(state.status, "idle");
  assert.deepEqual(transition(state, "advance"), state);
});

test("manual selection, matching revision approval, recovery and references complete five stages", () => {
  let state = transition(createDemo(), "start");
  state = transition(state, "advance");
  assert.equal(state.status, "waiting_selection");
  assert.deepEqual(transition(state, "advance"), state);
  state = transition(state, "select", { id: "local" });
  state = transition(state, "advance");
  state = transition(state, "advance");
  assert.equal(state.status, "waiting_revision");
  assert.throws(() => transition(state, "approve", { revision: "OLD-ID" }));
  assert.throws(() => transition(state, "resume"));
  state = transition(state, "approve", { revision: "DEMO-MR-01" });
  state = transition(state, "advance");
  state = transition(state, "advance");
  assert.equal(state.status, "blocked");
  assert.equal(state.failureInjected, true);
  const before = state.done;
  state = transition(state, "resume");
  assert.deepEqual(state.done, before);
  state = transition(state, "advance");
  state = transition(state, "advance");
  state = transition(state, "advance");
  assert.equal(state.status, "waiting_references");
  assert.throws(() => transition(state, "references", { slots: [true, false, true] }));
  state = transition(state, "references", { slots: [true, true, true] });
  state = transition(state, "advance");
  assert.equal(state.status, "completed");
  assert.deepEqual(state.done, ["search", "design", "writing", "table", "figure"]);
});

test("rejecting a proposal keeps the approval gate after resume", () => {
  let state = transition(createDemo(), "start", { manual: false });
  state = transition(transition(state, "advance"), "advance");
  state = transition(state, "reject");
  assert.equal(state.status, "paused");
  state = transition(state, "resume");
  assert.equal(state.status, "waiting_revision");
  assert.equal(state.approved, false);
  assert.deepEqual(transition(state, "advance"), state);
});

test("pause restores a reference wait rather than bypassing confirmation", () => {
  let state = transition(createDemo(), "start", { manual: false, revision: false, failure: false });
  for (let i = 0; i < 5; i++) state = transition(state, "advance");
  assert.equal(state.status, "waiting_references");
  state = transition(transition(state, "pause"), "resume");
  assert.equal(state.status, "waiting_references");
  assert.equal(state.referencesConfirmed, false);
});

test("abandonment never marks a research journey complete", () => {
  let state = transition(createDemo(), "start", { manual: false });
  state = transition(transition(state, "advance"), "advance");
  state = transition(state, "abandon");
  assert.equal(state.status, "abandoned");
  assert.deepEqual(state.done, ["search"]);
  assert.deepEqual(transition(state, "advance"), state);
});

test("invalid selection is rejected and transitions do not mutate the previous state", () => {
  const initial = createDemo();
  let state = transition(initial, "start");
  assert.equal(initial.status, "idle");
  state = transition(state, "advance");
  assert.throws(() => transition(state, "select", { id: "not-a-candidate" }));
  assert.equal(state.candidate, null);
});

test("human checkpoint destinations survive pause and are absent after decisions", async () => {
  const { checkpointFor } = await import("../flow.mjs");
  assert.equal(checkpointFor(createDemo()), null);
  let state = transition(transition(createDemo(), "start"), "advance");
  assert.deepEqual(checkpointFor(state), {id:"search", tab:"ideas"});
  assert.deepEqual(checkpointFor(transition(state, "pause")), {id:"search", tab:"ideas"});
  state = transition(state, "select", {id:"scale"});
  assert.equal(checkpointFor(state), null);
  state = transition(transition(state, "advance"), "advance");
  assert.deepEqual(checkpointFor(state), {id:"design", tab:"approval"});
  assert.deepEqual(checkpointFor(transition(state, "reject")), {id:"design", tab:"approval"});
  assert.equal(checkpointFor(transition(state, "abandon")), null);
  state = transition(createDemo(), "start", {manual:false,revision:false,failure:false});
  for(let i=0;i<5;i++) state = transition(state,"advance");
  assert.deepEqual(checkpointFor(state), {id:"figure",tab:"references"});
  assert.equal(checkpointFor(transition(state,"references",{slots:[true,true,true]})), null);
});
