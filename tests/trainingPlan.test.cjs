const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const ts = require("typescript");

function loadTs(file, overrides = {}) {
  const source = ts.transpileModule(readFileSync(resolve(__dirname, "..", file), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", source)((name) => Object.hasOwn(overrides, name) ? overrides[name] : require(name), module, module.exports);
  return module.exports;
}
const { parsePlanCsv } = loadTs("lib/trainingPlanCsv.ts");
const { comparePlan, weeklyComparison } = loadTs("lib/trainingPlan.ts");
const header = "date;phase;type semaine;durée (h);Tss cible\n";
const day = (date, duration_hours = 1, tss_target = 50) => ({ date, phase: "Base", week_type: "Charge 1", duration_hours, tss_target });

test("CSV accepts BOM, reordered accented headers and French decimal values", () => {
  const rows = parsePlanCsv('\uFEFFTss cible;durée (h);type semaine;phase;date\r\n40;0,75;Charge 1;"Base; reprise";02/11/2026');
  assert.deepEqual(rows, [{ date: "2026-11-02", phase: "Base; reprise", week_type: "Charge 1", duration_hours: 0.75, tss_target: 40 }]);
  assert.equal(parsePlanCsv('date,phase,type semaine,durée (h),Tss cible\n2026-11-02,Base,Charge,"1,5",80')[0].duration_hours, 1.5);
});

test("CSV preserves unknown goals separately from explicit rest", () => {
  const rows = parsePlanCsv(header + "02/11/2026;Base;Charge;;\n03/11/2026;Base;Charge;0;0");
  assert.equal(rows[0].duration_hours, null);
  assert.equal(rows[0].tss_target, null);
  assert.equal(rows[1].duration_hours, 0);
  assert.equal(rows[1].tss_target, 0);
});

test("invalid CSV rejects duplicates, impossible dates, malformed and negative targets", () => {
  for (const body of [
    "02/11/2026;Base;Charge;1;50\n02/11/2026;Base;Charge;2;100",
    "31/02/2027;Base;Charge;1;50",
    "02/11/2026;Base;Charge;-1;50",
    "02/11/2026;Base;Charge;abc;50",
    "02/11/2026;Base;Charge;25;50",
    "02/11/2026;Base;Charge;1;-1",
    "02/11/2026;;Charge;1;50",
    "02/11/2026;Base;Charge;1;50;extra",
  ]) assert.throws(() => parsePlanCsv(header + body), undefined, body);
  assert.throws(() => parsePlanCsv(header));
  assert.throws(() => parsePlanCsv("date;durée\n02/11/2026;1"));
});

test("CSV sorts rows and the downloadable example is importable", () => {
  const rows = parsePlanCsv(header + "04/11/2026;Base;Charge;1;50\n02/11/2026;Base;Charge;1;50");
  assert.equal(rows[0].date, "2026-11-02");
  assert.equal(parsePlanCsv(readFileSync(resolve(__dirname, "../public/plan-exemple.csv"), "utf8")).length, 7);
});

test("actuals aggregate all activities, prefer duration including zero and respect UTC cutoff", () => {
  const days = comparePlan([day("2026-11-02"), day("2026-11-03")], [
    { date: "2026-11-02T08:00:00Z", duration_hours: 1, moving_hours: 0.5, tss_final: 40 },
    { date: "2026-11-02T20:00:00Z", duration_hours: null, moving_hours: 0.5, tss_final: 20, tss_source: "estimated_hr" },
    { date: "2026-11-02T23:00:00Z", duration_hours: 0, moving_hours: 1, tss_final: null },
    { date: "2026-11-03T08:00:00Z", duration_hours: 4, tss_final: 200 },
  ], "2026-11-02");
  assert.equal(days[0].hours, 1.5);
  assert.equal(days[0].tss, 60);
  assert.equal(days[0].missingTss, 1);
  assert.equal(days[0].estimated, 1);
  assert.equal(days[1].hours, null);
  assert.equal(days[1].activities.length, 0);
});

test("unplanned days keep actual activities but do not become zero targets", () => {
  const days = comparePlan([day("2026-11-02"), day("2026-11-04")], [
    { date: "2026-11-03T08:00:00Z", duration_hours: 2, tss_final: 100 },
  ], "2026-11-04");
  assert.equal(days.length, 3);
  assert.equal(days[1].target, undefined);
  assert.equal(days[1].tss, 100);
  const week = weeklyComparison(days)[0];
  assert.equal(week.tss.actual, 100);
  assert.equal(week.tss.due, null);
  assert.equal(week.tss.planned, null);
});

test("weekly target at cutoff differs from full week and future actual remains unknown", () => {
  const plan = Array.from({ length: 14 }, (_, index) => day(`2026-11-${String(index + 2).padStart(2, "0")}`));
  const weeks = weeklyComparison(comparePlan(plan, [], "2026-11-04"));
  assert.equal(weeks[0].hours.planned, 7);
  assert.equal(weeks[0].hours.due, 3);
  assert.equal(weeks[0].tss.due, 150);
  assert.equal(weeks[0].hours.actual, 0);
  assert.equal(weeks[1].hours.actual, null);
  assert.equal(weeks[1].hours.due, null);
});

test("a plan beginning midweek has an unknown target for the incomplete first week", () => {
  const week = weeklyComparison(comparePlan([day("2026-11-04"), day("2026-11-05")], [], "2026-11-05"))[0];
  assert.equal(week.hours.planned, null);
  assert.equal(week.hours.due, null);
});

test("plan API requires authentication and rejects invalid files without mutation", async () => {
  let calls = 0;
  const createRoute = (user) => loadTs("app/api/import-plan/route.ts", {
    "@/lib/auth": { getAuthenticatedUser: async () => user },
    "@/lib/trainingPlanCsv": { parsePlanCsv },
    "@/lib/supabaseAdmin": { supabaseAdmin: { rpc: async () => { calls++; return { data: {}, error: null }; } } },
  });
  const request = () => new Request("http://localhost/api/import-plan", { method: "POST", body: new FormData() });
  assert.equal((await createRoute(null).POST(request())).status, 401);
  assert.equal((await createRoute({ id: "user-1" }).POST(request())).status, 400);
  const form = new FormData();
  form.set("file", new File([header + "31/02/2027;Base;Charge;1;50"], "plan.csv"));
  assert.equal((await createRoute({ id: "user-1" }).POST(new Request("http://localhost/api/import-plan", { method: "POST", body: form }))).status, 400);
  assert.equal(calls, 0);
});

test("plan API sends validated entries and authenticated identity in a single atomic RPC", async () => {
  let args;
  const route = loadTs("app/api/import-plan/route.ts", {
    "@/lib/auth": { getAuthenticatedUser: async () => ({ id: "user-1" }) },
    "@/lib/trainingPlanCsv": { parsePlanCsv },
    "@/lib/supabaseAdmin": { supabaseAdmin: { rpc: async (name, payload) => {
      assert.equal(name, "import_training_plan"); args = payload;
      return { data: { added: 1, updated: 1, unchanged: 0 }, error: null };
    } } },
  });
  const form = new FormData();
  form.set("file", new File([header + "02/11/2026;Base;Charge;1;50\n03/11/2026;Base;Charge;2;100"], "plan.csv"));
  form.set("user_id", "another-user");
  const response = await route.POST(new Request("http://localhost/api/import-plan", { method: "POST", body: form }));
  assert.equal(response.status, 200);
  assert.equal(args.p_user_id, "user-1");
  assert.equal(args.p_entries.length, 2);
  assert.deepEqual(await response.json(), { added: 1, updated: 1, unchanged: 0, start: "2026-11-02", end: "2026-11-03" });
});
