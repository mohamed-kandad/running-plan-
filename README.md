# Stride — running plan

A local-first Expo (React Native) app that turns a race goal into a week-by-week running plan and
tracks what you actually ran. No backend, no account: everything lives in AsyncStorage on the device.

## Tabs

| Tab | What it does |
| --- | --- |
| **Today** | A compact paper-style card for today's session ([TodayCard](src/components/TodayCard.tsx)): a date + phase eyebrow, a colour rail and dot keyed to the session type, icon-only actions (log / open plan) instead of buttons, one hairline strip with distance, target pace and HR band, a two-line coaching brief and a logged chip once the run is in (tap the pencil for the log sheet: distance, time, avg HR, effort, notes). Below it: this week's km, sessions completed and adherence, then **This week** — all seven days as cards (rest days dashed, today outlined, completed sessions checked and struck through, bar scaled to the week's longest run). |
| **Plan** | Goal/race countdown, planned volume and progress, week chips and the selected week as the same seven day cards. The settings sheet rebuilds the plan for a different goal (5K / 10K / Half), 3–5 runs per week, beginner/intermediate and race date. Logged runs survive a rebuild. **Excel & calendar** is fully two-way: export the plan as a real `.xlsx`, import a workbook you edited to rebuild the plan, push upcoming sessions to the phone's calendar and pull completed or unplanned runs back out of it. |
| **Calendar** (centre tab) | Month grid with week streak, sessions and km for the month. Days with a logged run show the running-shoe badge, scheduled days get a type-coloured dot, today is ringed; arrows page through months and tapping a day shows its runs or the planned session (tappable to log). |
| **Progress** | Total km/time, average pace, last 8 weeks bar chart, adherence, time-in-zone split from logged HR, recent runs with delete, and reset. |
| **Zones** | Five HR zones derived from max HR (50–60/60–70/70–80/80–90/90–100%). Max and resting HR are editable; each zone's low/high edge can be tuned and stays contiguous. |

## Structure

```
src/app/_layout.tsx          root Stack + AppProvider (loads saved state)
src/app/(tabs)/_layout.tsx   JS bottom tabs (expo-router/js-tabs)
src/app/(tabs)/index.tsx     Today
src/app/(tabs)/calendar.tsx  Calendar (centre tab)
src/app/(tabs)/plan.tsx      Plan + plan settings sheet
src/app/(tabs)/progress.tsx  Progress
src/app/(tabs)/zones.tsx     Zones
src/components/              Sheet, ui primitives, TodayCard, day rows, week strip, run log sheet
src/lib/plan.ts              Deterministic plan generator (build/cutback/taper)
src/lib/exportPlan.ts        Plan + runs workbook, written as a zip stream to .xlsx
src/lib/importPlan.ts        Workbook parsing (sheet detection, dates, types) + file pick
src/lib/calendarSync.ts      Device calendar push (upsert) / pull (sessions + extra runs)
src/lib/zones.ts             Zone maths and contiguous-edge editing
src/lib/stats.ts             Totals, weekly buckets, streaks, adherence
src/store/AppStore.tsx       AsyncStorage persistence + actions
```

Plan generation is deterministic: a Monday-based start week, fixed training-day slots per
days-per-week setting, quality sessions alternating intervals and tempo, a cutback every fourth week
and a taper into race day. Workout ids are `date-type`, so completions survive plan rebuilds.

## Excel export

The workbook is built with SheetJS (`xlsx`), installed from the official cdn.sheetjs.com tarball for
0.20.3 — the npm-registry copy is stale, so `npm install xlsx` would pull an old release. It is
loaded with a dynamic `import()` inside [exportPlan.ts](src/lib/exportPlan.ts), which keeps the
~500 KB library out of the app's start-up path and in its own web chunk. Sheets: **Plan** (date,
week, session, type, km, zone, target pace, status, notes), **Runs** (logged distance, duration,
pace, avg HR, effort, notes) and **Settings** (goal, level, runs/week, plan start, race date,
export date). The workbook is written to a `Uint8Array`; on device it lands in the cache directory
through the `expo-file-system` `File` API and opens in the system share sheet via `expo-sharing`
(AirDrop, Mail, Files), on web it becomes a Blob download named `stride-<goal>-<date>.xlsx`.

## Excel import

[importPlan.ts](src/lib/importPlan.ts) is the other half of the round trip: export a workbook, edit
the dates, distances or sessions in Excel, Numbers or Google Sheets, then **Import plan from Excel**
on the Plan tab. The picked file comes from `expo-document-picker` and is read with SheetJS.

- Sheet detection: a sheet named `Plan`, `Sessions` or `Training`, otherwise the first sheet with a
date and a session/title column. A `Runs` sheet (or any sheet with distance + duration and no
session column) is imported as logged runs.
- Columns are matched loosely — `Date`/`Day`, `Session`/`Title`/`Workout`, `Distance`/`Distance (km)`/
  `Km`, plus optional `Type`, `Zone`, `Week`, `Notes`, `Avg HR`, `Effort`, `Duration`. Extra columns
  are ignored.
- Values are coerced: real dates, Excel serial numbers, `YYYY-MM-DD`, `17/11/2026` (day-first) and
  most date strings all parse; type is inferred from the session name when the column is missing;
  a missing zone comes from the type; `h:mm:ss` or `mm:ss` durations parse back into runs.
- Importing sessions **replaces** the generated plan and sets plan start / race date to the first and
  last row. Runs are merged, never duplicated, and linked to the session on the same day. Row
  problems are skipped and counted in the status line instead of failing the whole import.

The generated plan comes back the moment you change goal, days or level in settings — import again
from your workbook if you want to keep a hand-edited schedule.

## Calendar sync

Two-way, via `expo-calendar`. **Push plan to Calendar** mirrors every upcoming session into a
writable calendar at 07:00 with a 30-minute reminder. Event ids are remembered in AsyncStorage, so a
second push updates the existing events in place (and recreates any you deleted in the Calendar app)
rather than duplicating them. **Pull from Calendar** scans the writable calendars ±14 days around
the plan: a training-looking event on a plan day marks that session complete with the event's real
duration, an already-logged session is left alone, and a past training event on a day with no
planned session is logged as an **extra run** (distance estimated at 6:00 /km from the event length).
Web has no calendar API, so both calendar actions report that they need the iOS/Android app.
`expo-calendar` and `expo-document-picker` ship in Expo Go for SDK 58; a development build is only
needed if you strip them out of the client.

## Commands

```bash
npm start            # Expo dev server (press w for web, i / a for simulators)
npm run ios          # open on iOS simulator
npm run android      # open on Android emulator
npm run web          # open in the browser
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npx expo install --fix   # resolve SDK-compatible dependency versions
```

Native code is generated (CNG) — configure native behaviour in `app.json`, never in `ios/` or
`android/`. AsyncStorage ships with Expo Go, so no development build is required.

# running-plan-
