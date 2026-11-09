const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const { resolve, dirname } = require("node:path");
const ts = require("typescript");

// Load the actual TypeScript modules with the project's installed compiler.
function loadTs(file, overrides = {}) {
  const filename = resolve(__dirname, "..", file);
  const source = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(overrides, name) ? overrides[name] : name.startsWith(".")
    ? loadTs(resolve(dirname(filename), `${name}.ts`), overrides)
    : require(name);
  new Function("require", "module", "exports", source)(localRequire, module, module.exports);
  return module.exports;
}

const { seasonStart, seasonEnd, seasonWeekCount, seasonFields, seasonForDate, weekInSeason, seasonContext, isInSeason } = loadTs("lib/season.ts");
const { parseGarminCsv } = loadTs("lib/garmin.ts");
const { seasonChartRange } = loadTs("lib/seasonChartRange.ts");

test("chart range grows from season start through the following month", () => {
  assert.deepEqual(seasonChartRange(2027, new Date("2026-11-09T12:00:00Z")), { months: 2, weeks: 9 });
  assert.deepEqual(seasonChartRange(2027, new Date("2026-12-01T12:00:00Z")), { months: 3, weeks: 13 });
  assert.deepEqual(seasonChartRange(2027, new Date("2027-01-01T12:00:00Z")), { months: 4, weeks: 17 });
  assert.deepEqual(seasonChartRange(2027, new Date("2027-09-01T12:00:00Z")), { months: 12, weeks: 52 });
  assert.deepEqual(seasonChartRange(2027, new Date("2027-10-31T12:00:00Z")), { months: 12, weeks: 52 });
});

test("completed seasons and transition retain the full chart range", () => {
  assert.deepEqual(seasonChartRange(2026, new Date("2026-11-09T12:00:00Z")), { months: 12, weeks: 52 });
  assert.deepEqual(seasonChartRange(2028, new Date("2028-10-30T12:00:00Z")), { months: 12, weeks: 52 });
  assert.deepEqual(seasonChartRange(2029, new Date("2028-11-06T12:00:00Z")), { months: 2, weeks: 8 });
});

test("2027 season starts Monday November 2 and ends Sunday October 31", () => {
  assert.equal(seasonStart(2027).toISOString(), "2026-11-02T00:00:00.000Z");
  assert.equal(seasonEnd(2027).toISOString(), "2027-10-31T23:59:59.999Z");
  assert.equal(seasonWeekCount(2027), 52);
  assert.equal(seasonWeekCount(2028), 52);
  assert.equal(seasonEnd(2028).toISOString(), "2028-10-29T23:59:59.999Z");
  assert.equal(seasonWeekCount(2026), 52);
});

test("boundary dates belong to the right season, week and monthly bucket", () => {
  for (const [date, season, week, month] of [
    ["2026-11-01T23:59:59.999Z", 2026, 52, 12],
    ["2026-11-02T00:00:00.000Z", 2027, 1, 1],
    ["2026-11-08T23:59:59.999Z", 2027, 1, 1],
    ["2026-11-09T00:00:00.000Z", 2027, 2, 1],
    ["2027-10-31T23:59:59.999Z", 2027, 52, 12],
    ["2027-11-01T00:00:00.000Z", 2028, 1, 1],
    ["2028-10-29T23:59:59.999Z", 2028, 52, 12],
    ["2028-10-30T00:00:00.000Z", null, null, null],
    ["2028-11-05T23:59:59.999Z", null, null, null],
    ["2028-11-06T00:00:00.000Z", 2029, 1, 1],
    ["2027-01-01T00:00:00.000Z", 2027, 9, 3],
  ]) {
    assert.deepEqual(seasonFields(new Date(date)), {
      season, week_in_season: week, month_in_season: month,
    }, date);
  }
});

test("every season has 52 weeks of seven days, with zero or seven transition days", () => {
  for (let season = 2000; season <= 2040; season++) {
    const start = seasonStart(season);
    const next = seasonStart(season + 1);
    assert.equal(start.getUTCDay(), 1);
    assert.equal(start.getUTCMonth(), 10);
    assert.ok(start.getUTCDate() >= 1 && start.getUTCDate() <= 7);
    assert.equal(seasonEnd(season).getUTCDay(), 0);
    assert.equal(seasonWeekCount(season), 52);
    const weekDays = Array(52).fill(0);
    let transitionDays = 0;
    for (let time = start.getTime(), day = 0; time < next.getTime(); time += 86400000, day++) {
      const fields = seasonFields(new Date(time));
      if (day >= 364) {
        assert.deepEqual(fields, { season: null, week_in_season: null, month_in_season: null });
        transitionDays++;
      } else {
        assert.equal(fields.season, season);
        assert.equal(fields.week_in_season, Math.floor(day / 7) + 1);
        assert.ok(fields.month_in_season >= 1 && fields.month_in_season <= 12);
        weekDays[fields.week_in_season - 1]++;
      }
    }
    assert.deepEqual(weekDays, Array(52).fill(7));
    assert.ok([0, 7].includes(transitionDays));
  }
});

test("Garmin imports use the same season boundaries as PMC calendar dates", () => {
  const csv = "Date,Activity Type,Title,Duration\n2026-11-01T12:00:00Z,cycling,Sunday,01:00:00\n2026-11-02T12:00:00Z,cycling,Monday,01:00:00";
  const rows = parseGarminCsv(csv);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(({ season, week_in_season, month_in_season }) =>
    ({ season, week_in_season, month_in_season })), [
    { season: 2026, week_in_season: 52, month_in_season: 12 },
    { season: 2027, week_in_season: 1, month_in_season: 1 },
  ]);
});


test("transition is excluded from seasonal totals and navigation shows the completed season", () => {
  const transition = new Date("2028-10-30T12:00:00Z");
  assert.equal(seasonForDate(transition), null);
  assert.equal(weekInSeason(transition), null);
  assert.equal(weekInSeason(transition, 2028), null);
  assert.deepEqual(seasonContext(transition), { currentSeason: 2028, currentWeek: 52, isTransition: true });
  const csv = "Date,Activity Type,Title,Duration,TSS\n2028-10-29T12:00:00Z,cycling,Season,01:00:00,50\n2028-10-30T12:00:00Z,cycling,Transition,01:00:00,100\n2028-11-06T12:00:00Z,cycling,Next season,01:00:00,70";
  const rows = parseGarminCsv(csv);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].season, null);
  assert.equal(rows[1].week_in_season, null);
  assert.equal(rows[1].month_in_season, null);
  assert.deepEqual(rows.filter(isInSeason).map((row) => row.season), [2028, 2029]);
  assert.equal(rows.filter(isInSeason).reduce((sum, row) => sum + row.tss_final, 0), 120);
});

test("PMC retains transition TSS and carries training load into the next season", async () => {
  const input = [
    { date: "2028-10-29T12:00:00Z", tss_final: 0 },
    { date: "2028-10-30T12:00:00Z", tss_final: 100 },
    { date: "2028-11-06T12:00:00Z", tss_final: 0 },
  ];
  const saved = [];
  const supabaseAdmin = { from: () => ({
    select: () => ({ order: async () => ({ data: input, error: null }) }),
    delete: () => ({ neq: async () => ({ error: null }) }),
    upsert: async (rows) => { saved.push(...rows); return { error: null }; },
  }) };
  const { recomputePmc } = loadTs("lib/pmc.ts", { "./supabaseAdmin": { supabaseAdmin } });
  assert.deepEqual(await recomputePmc(), { days: 9 });
  const transition = saved.filter((row) => row.season === null);
  assert.equal(transition.length, 7);
  assert.equal(transition.reduce((sum, row) => sum + row.tss, 0), 100);
  assert.equal(saved[0].week_in_season, 52);
  assert.equal(saved.at(-1).season, 2029);
  assert.equal(saved.at(-1).week_in_season, 1);
  let ctl = 0;
  let atl = 0;
  for (const row of saved) {
    ctl += (row.tss - ctl) / 42;
    atl += (row.tss - atl) / 7;
    assert.equal(row.ctl, ctl);
    assert.equal(row.atl, atl);
    assert.equal(row.tsb, ctl - atl);
  }
  assert.ok(saved.at(-1).ctl > 0);
});


test("recap offers completed seasons even after the first import of the new season", () => {
  const { completedSeasons } = loadTs("lib/seasonRecap.ts");
  const rows = [
    { date: "2025-10-01T12:00:00Z" },
    { date: "2026-01-01T12:00:00Z" },
    { date: "2026-11-01T12:00:00Z" },
    { date: "2026-11-02T12:00:00Z" },
  ];
  assert.deepEqual(completedSeasons(rows, new Date("2026-11-02T14:00:00Z")), [2026, 2025]);
  assert.deepEqual(completedSeasons(rows, new Date("2026-11-01T12:00:00Z")), [2025]);
  // A season becomes available as soon as its 52 weeks end, including during transition.
  assert.deepEqual(completedSeasons([
    { date: "2028-10-29T12:00:00Z" }, { date: "2028-10-30T12:00:00Z" },
  ], new Date("2028-10-31T12:00:00Z")), [2028]);
  assert.deepEqual(completedSeasons([], new Date()), []);
});

test("recap preserves week 52 and excludes later seasons and transition activity", () => {
  const { recapRows } = loadTs("lib/seasonRecap.ts");
  const rows = [
    { date: "2027-01-01T12:00:00Z", tss: 50 },
    { date: "2028-01-01T12:00:00Z", tss: 100 },
    { date: "2028-10-29T12:00:00Z", tss: 200 },
    { date: "2028-10-30T12:00:00Z", tss: 999 },
    { date: "2028-11-06T12:00:00Z", tss: 500 },
  ].map((row) => ({ ...row, ...seasonFields(new Date(row.date)) })).filter(isInSeason);
  const recap = recapRows(rows, 2028);
  assert.deepEqual([...new Set(recap.map((row) => row.season))], [2027, 2028]);
  assert.ok(recap.some((row) => row.week_in_season === 52));
  assert.equal(recap.filter((row) => row.season === 2028).reduce((sum, row) => sum + row.tss, 0), 300);
  assert.equal(recapRows(rows, 2027).length, 1);
  assert.deepEqual(recapRows(rows), rows);
});


test("annual totals show actual full-season metrics in descending order", () => {
  const { annualSeasonTotals } = loadTs("lib/seasonRecap.ts");
  const row = (season, tss_final, duration_hours, distance_km, elevation_m) =>
    ({ season, tss_final, duration_hours, distance_km, elevation_m });
  const rows = [
    row(2025, 50, 1, 30, 300),
    row(2026, 100, 2, 60, 600),
    row(2023, null, null, null, null),
    row(2026, 150, 3, 90, 900),
    row(2024, 80, 1.5, 40, 400),
    row(2027, 999, 99, 999, 9999),
    row(null, 999, 99, 999, 9999),
  ];
  assert.deepEqual(annualSeasonTotals(rows, 2026), [
    { season: 2026, tss: 250, hours: 5, distance: 150, elevation: 1500 },
    { season: 2025, tss: 50, hours: 1, distance: 30, elevation: 300 },
    { season: 2024, tss: 80, hours: 1.5, distance: 40, elevation: 400 },
    { season: 2023, tss: 0, hours: 0, distance: 0, elevation: 0 },
  ]);
  assert.equal(annualSeasonTotals(rows, 2025)[0].season, 2025);
  assert.deepEqual(annualSeasonTotals([], 2026), []);
});
