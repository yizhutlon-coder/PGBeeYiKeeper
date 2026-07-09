# Project Gorgon — Arthropod Genetics Toolset

## What this project is
A suite of React tools for breeding arthropods (bees/wasps) in the game Project Gorgon.
The player (ThatYiGuy) has MAX Genetics skill, meaning they can read exact genome states.
The goal is to breed specimens where all stat genes are recessive (〇), which gives stat bonuses.

**Branded "PGBeeYiKeeper"** — tagline "Tool to help you create the perfect Combat Bee in Project
Gorgon." Live at https://yizhutlon-coder.github.io/PGBeeYiKeeper/ (auto-deploys on push to `main`).
Vite + React, 100% client-side (all data in `localStorage`), no backend. See **Deployment &
Distribution** and **Current status / handoff** at the bottom.

---

## The Genetics System

### Gene states
- `R` = double recessive = **〇** — gives stat bonus, breeds true
- `D` = double dominant = **⬤** — no bonus
- `x` = mixed (one of each) = **⦿** — no bonus, unpredictable offspring

### Cross outcomes (expected 〇 probability in offspring)
| Cross | Result | % chance of 〇 |
|-------|--------|----------------|
| R × R | 100% R | 100% |
| R × x | 50% R, 50% x | 50% |
| x × x | 25% R, 50% x, 25% D | 25% |
| R × D | 100% x | 0% |
| x × D | 50% x, 50% D | 0% |
| D × D | 100% D | 0% |

### Gene tiers (priority order)
- 💎 **Orange / Paramount** — always dominant in wild, mutation-only. Tracked always. Coords: 01G3, 01I1, 02E2, 03F3, 03G3, 03I2, 03I4, 04A1, 04E2, 04E3
- 🔴 **Critical (crit)** — CR06–CR09AB, rare, dominant-biased, highest breeding priority. Weight = 3×
- 🟡 **Standard (std)** — CR01–CR05, CR09C–E. Normal stat genes. Weight = 1×
- 🔵 **Floor** — always recessive, never need to breed for. Ignored in scoring. Coords: 01D3, 03A4, 03B3, 03B4, 03D1, 03D3, 04B2, 04D1, 04D2
- ⛔ **Orange** — always dominant, mutation only (see paramount above)

### Inbreeding
Zero penalty in Project Gorgon. Sib-crossing is a core strategy. CR10 = visual only, ignored.

---

## Shared Data Module: `src/data/geneData.js`

This is the single source of truth. All tools import from here. Never duplicate the database.

### Confirmed stat gene values (verified by player)
Key confirmed values worth noting:
- `06A1` = T (Toughness) crit v:9 — joint-highest known (tied with 07J1 Ru v:9)
- `06A2` = V (Versatility) **crit** v:7 — reclassified std → crit (2026-06-11)
- `06A3` = Fe (Ferocity) crit v:5
- `07F3` = Fr (Frost) crit v:3
- `07I4` = T crit v:4
- `09C2` = Fr std v:7
- `09D1` = Fr std v:2
- `09D2` = Ru std v:4
- `09D4` = En std v:3
- `09E1` = I std v:5
- `09E4` = V std v:5

### Still unknown stat (s: '?')
Only `03G3` remains (orange tier — never bred for, so stat/value are irrelevant).
All former `?`-stat positions were confirmed 2026-06-10: 01F4=Ru, 08A4=I, 08C2=En,
08E1=I, 08F2=Ru, 09A4=T, 09B4=En. Also corrected: 07F2 Fr→En, 09B3 En→Fe.

### Missing values (v:0) — critical genes
All CR06–CR09 critical genes now have confirmed values (filled 2026-06-10 via the
gene map editor). Joint-highest known value is now `07J1` Ru crit **v:9**, tying
`06A1` T crit v:9. Other strong crits: 08B2 Fe v:7, 08A2 T v:7, 07C2 Fr v:7,
07B4 En v:7, 06C2 Ru v:7.

---

## Shared Logic Module: `src/lib/genetics.js`

### expR(a, b) — expected probability of R in offspring
```js
function expR(a, b) {
  if (!a || !b || a === '?' || b === '?') return 0;
  const k = [a, b].sort().join('');
  return ({ RR: 1, Rx: 0.5, xx: 0.25, DR: 0, RD: 0, Dx: 0, xD: 0, DD: 0 })[k] ?? 0;
}
```

### Scoring modes
**Clarification mode** (`expand = false`): rank pairings by expected 〇 in offspring. Weight each gene by tier (crit = 3×). Best for cleaning up a known-good line.

**Expansion mode** (`expand = true`): rank pairings by what THIS MALE specifically lacks. Score based on male's genome, not stable-wide coverage:
- Male has R → 0.1× weight (done)
- Male has x → 1× weight (can help clarify)  
- Male has D → 3× if female has R, 1.5× if female has x (fold-in opportunity)

### Mutation mode
**Always on.** Orange genes are paramount tier and should always be tracked. The toggle was removed.

---

## Genome Parser: `src/lib/parser.js`

Parses the in-game export format:
```
[Overview]
Format=v1.0
Character=PlayerName
Entity=SpecimenName
Genome=BeeWasp

[Genes]
01= RDRD RDRR DDRR RDRR DDRR RDRR DRRR DRRR DRRR RDRR
02= ...
```

- CR01–CR09 each have up to 10 groups (A–J), 4 positions each = 40 positions per chromosome
- `Entity=` line contains the specimen name — gender detection was removed, now always uses dropdown
- Multiple exports can be pasted at once; parser splits on `[Overview]`

---

## Tool Architecture

### Tool 1: Main Calculator (`Calculator.jsx`)
**Tabs:** Analyze | Stable | Pairs | Manage | Gene Map  *(Analyze is the default/first tab; the old Import tab was removed — Analyze absorbed it.)*

**Key features:**
- **Analyze:** two ways to add specimens. (a) Bulk — drag/drop or choose multiple `.txt`
  exports (`BulkImport.jsx`), each file may hold several `[Overview]` blocks → set a gender per
  specimen → "Add all to stable". (b) Single — paste one export for a "scouting" contribution
  preview vs the stable, then add with gender. Skips orange in the analysis but shows a 💎
  mutation stat box when present.
- **Stable:** specimen cards (Score, Crit 〇, Std 〇; a 💎 paramount-mutation pill and a mixed-genes
  pill when present), inline rename, delete → a loss-preview modal. A **"Show critical genes" toggle**
  reveals each specimen's crit genes as chips. **Folders + drag-reorder:** cards are draggable to
  reorder (reorders the shared `pg-v3` array) or to drop into **collapsible folder sections**
  (▾/▸, live count, inline rename, delete → items fall to Unfiled). "📁 New folder" creates one; an
  Unfiled section (orphan-safe — catches any unknown folderId) holds the rest.
- **Color is a folder property** (moved off individual specimens): each folder header has the 4-color
  picker; every card in a colored folder inherits that color as its border + a `📁 <folder>` **tag
  that shows across all tabs** (Pairs male cards + female rows, Manage rows). `specColor(s)` resolves
  folder color → **legacy per-specimen `pg-tags-v1` fallback** (read-only `LEGACY-COMPAT`, flagged to
  retire — kept only so pre-folder live users don't lose old colors) → none.
- **Pairs:** male-first — click a male to see females ranked by clarification score. Male cards are
  **drag-reorderable** (shared order; `keepFolder` so it never refolders them); females stay ranked.
  Strategy pills: clarifies / fold-in / mixes / +new-to-pool. A **"Detailed cross mode" toggle**
  (renamed from the old "Expansion mode") reveals a **gender-split cross-outcome breakdown** per
  pairing — a *Both* row (R+R, M+M) plus **♂ male / ♀ female** rows of R+M / R+D / M+D, colored on a
  pink→red cost gradient (`♂ R+D` = his clean gene diluted; `♀ R+D` = fold-in). Click any box to
  expand the per-gene detail. **Detailed cross mode is informational only — it NEVER changes the
  score/ranking** (both `getTopPairs` and `malePairings` always call `scorePair(..., false, ...)`).
- **Manage:** deletion-safety ranking; a specimen's folder color + `📁` tag show on each row.
  Removing a specimen previews exactly what would be lost from the pool.
- **Gene Map:** chromosome heatmap CR01–CR09. Hover shows the stat (colored per-stat via `statCol`)
  + value (colored by magnitude via `valCol`) + tier; **mutation/orange genes are outlined purple**;
  click a gene → a per-specimen 〇/⦿/⬤ breakdown box.

**Mutation (orange/paramount) tracking:** `calcStats` returns `mutR` and `getCoverage` returns
`mutTotal/mutCov/mutProg` (orange split out of the Standard counts — Standard total is now 64, not
75). Surfaced as 💎 across Stable, Pairs, Manage, Analyze, and Gene Map.

**Storage keys:** `pg-v3` (specimens; each may carry an optional `folderId`), `pg-folders-v1`
(`[{id, name, color}]`). Legacy `pg-tags-v1` (old per-specimen colors) is read-only for back-compat.
All are additive — old saves load fine (missing `folderId` = Unfiled); a code deploy to the same
GitHub Pages origin never clears localStorage, so live users keep their data with no re-import.

**pairedIds logic:** A specimen is "paired" if it has at least one valid partner of opposite gender in the stable. No cooldown restrictions.

### Tool 2: Sib-Cross Planner (`Planner.jsx`)
Multi-project manager for tracking a sib-cross breeding program.

**Tabs:** Recommendations | Forecast | Gene Map | Specimens

**Features:**
- Multiple projects via project tab bar (click ✎ to rename, × to delete, + to add)
- Each project: independent parents A+B, offspring pool, recommendations
- Parents and offspring can be added two ways (via `ImportPanel`): paste a genome
  export, or pick an existing specimen from the Calculator's stable (`pg-v3`).
  Gender prefills from the stable specimen; offspring also take a generation (F1–F8)
- Recommendations ranked by expected 〇 output, showing clarify/recover/new/mixes pills
- **Forecast tab** (`components/ForecastView.jsx`): Monte Carlo projection of sib-crossing
  the project's two parents — generation timeline (avg 〇/gen, 90%/95% thresholds),
  max achievable split by tier (Standard / Critical / Mutation-paramount), a position
  breakdown (free/need-work/at-risk/impossible over std+crit), and feasibility flags
  (diluted crits, "neither parent has it → need 3rd donor"). Mutation/orange genes are
  tracked on their own track — only achievable when a parent already carries one — so they
  never inflate the std/crit "impossible" count; carried ones get a 💎 highlight.
  Auto-runs on the parents already loaded; no pasting. (Absorbed the old Breeding Plan tool.)
- Gene map tab showing pool-wide coverage
- Specimens tab with per-specimen scores
- No window.confirm — uses inline two-step confirmation for destructive actions

**Storage key:** `pg-planner-v2` (localStorage). Migrates from `pg-planner-v1` automatically.

> The SG database (`geneData.js`) is edited directly. When the player discovers
> new gene values in-game, Claude updates `geneData.js` — an interactive map
> widget can be generated on request to collect the corrections. (A standalone
> Gene Editor tool existed during the artifact era; it was removed once the
> values were entered.)

---

## JSX / React Rules for This Project

### CRITICAL: Unicode in JSX
**Never put unicode characters in double-quoted JSX attributes.**
`label="text with 〇"` → Babel parse error.
Use JSX expressions instead: `label={'text with \u25CE'}` or actual characters in text nodes.

Unicode in JSX text nodes (between `>` and `<`) is fine: `<span>♂ {name}</span>`
Unicode in JS string expressions is fine: `{'\u2642'}` or `{'♂'}`

### CRITICAL: Brace balance
After every significant edit, verify brace depth = 0 using the state-machine scanner (handles strings/comments). The naive Python counter gives false positives — use the full scanner.

### Component definitions
Never define components inside IIFE render blocks or inside other component render returns. Always define at module level. This caused `AnalyzeGeneMap` / `AnalyzeStatBox` / `AnalyzeChip` bugs in the original version.

### No window.confirm
Blocked in iframes (Claude.ai artifacts). Use inline two-step state-based confirmation instead.

### Storage
In standalone HTML files: localStorage with a shim that matches the `window.storage` async API used by Claude artifacts.

---

## Breeding Strategy Knowledge

### Sib-cross vs back-cross
- **Back-cross**: offspring × original parent → converges toward one parent, used for fold-in cleanup
- **Sib-cross**: offspring × sibling → preserves genes from BOTH parents, used when combining two lines

### Fold-in process (~4-5 generations)
1. Cross donor × clarified anchor → F1 offspring (all ⦿ at new genes)
2. Back-cross F1 × anchor × 3-4 generations (screens for offspring keeping new gene)
3. Result: anchor genome + new gene locked as 〇

### Parallel lines strategy
- Phase 1: All fold-ins simultaneously (saves calendar time)
- Phase 2: Combine pairwise — never 3+ simultaneously
- Securing rule: lock each combination before adding next
- Key insight: combining two clarified lines is cheap (~2–8 ⦿ cleanup) vs fresh wild donor (~44 ⦿)

### First-gen capture
Cross rare donor × clarified line once → park ⦿ offspring → wait until anchor is maximally clarified → begin proper back-cross cycles. Preserves access to rare genes without committing to cleanup immediately.

### Wild specimen fold-in risk
A wild-caught specimen with ~14 mixed genes risks losing ~half the fold-in genes on the first cross (⦿ × D = 50% D). Always pre-clarify 2–3 generations within archetype before folding into a clarified line.

---

## Archetype Knowledge (Project Gorgon)

Three main arthropod archetypes, each with a different distribution of standard genes:
- **Fae Bee** — player's current nearly-clarified line
- **Freeze Wasp** — vs clarified Fae Bee: fold-in 15 std, mix 16 std
- **Blinding Wasp** — vs clarified Fae Bee: fold-in 19 std, mix 18 std

### FW × BW cross
fold-in 15, mix 16, clarify 5. The three archetypes form roughly an equilateral triangle — they're about as different from each other as from the Fae Bee. No shortcut from combining FW+BW before folding into FB.

### Recommended strategy for combining all three
1. Pre-clarify FW and BW in parallel (2–3 sib-cross generations each, catch multiple wild)
2. Fold FW into Fae Bee first (smaller disruption: 15 fold-in, 16 mix)
3. Recover Fae Bee line fully
4. Fold BW into FB+FW line (19 fold-in, 18 mix)

---

## Current Project Status

### Specimens analyzed (as of last session)
| Specimen | Key genes | Notes |
|----------|-----------|-------|
| Kid1M | none crit | Very clarified, 2 ⦿ at std |
| Female Freeze Wasp | none crit | 8 new std genes vs Kid1M |
| Female Freeze Wasp 06B1 | 06B1 (Ru crit) | Slightly messier than FW1 |
| Male 06A1 | 06A1 (T crit v:9) | Highest known value — priority fold-in |
| Female 07J4+08C2 | 07J4 (T crit), 08C2 (? crit) | Two crits together |
| Pair3F / Kid3F | 06A2 (V std v:7) | Siblings, 93.3% identical |

### Priority breeding queue
1. **06A1 fold-in** — Male06A1 × clarified female. T v:9, highest value.
2. **07J4 + 08C2 fold-in** — Female07J4 × clarified male. Two crits together.
3. **Std gene base** — Kid1M × Freeze Wasp sib-cross program. ~5–6 generations.
4. **FW + BW fold-in** — after std base is complete.

### Max achievable std genes (Kid1M × FW)
~52/65 std achievable. 13 positions neither has (need 3rd donor). Key missing: 01G2 (T v:6), 02B2 (I v:6), 06A2, 09C2.

---

## File Structure

```
src/
  data/
    geneData.js       ← SG database, single source of truth
  lib/
    genetics.js       ← expR, calcStats, scorePair, getTopPairs, getDelList, getCoverage, scorePairPool, specimenScore, poolCoverage, classifyPosition, f1ProbR, f1ProbX, simulate
    parser.js         ← parseExport, parseAll, parseGenome
    storage.js        ← localStorage shim (window.storage-compatible) + loadData/saveData
    theme.js          ← shared palette (C) + symCol + statCol (per-stat hue) + valCol (value magnitude)
  components/
    CoverageMap.jsx   ← Shared chromosome heatmap; click a gene for a per-specimen R/x/D breakdown (parents tagged PA/PB)
    ImportPanel.jsx   ← Shared single import (Planner): paste an export OR pick from the Calculator stable (pg-v3), with gender + generation
    BulkImport.jsx    ← Calculator Analyze tab: drag/drop or choose many .txt exports → per-specimen gender → add all
    ForecastView.jsx  ← Monte Carlo generation forecast (Planner's Forecast tab)
    BackupControls.jsx← Nav "Data ▾" menu: export/import all pg-* localStorage keys as JSON (cross-origin migration + backup)
  Calculator.jsx      ← Main stable manager (pg-v3)
  Planner.jsx         ← Sib-cross multi-project planner (+ Forecast tab)
  App.jsx             ← Nav (brand "🐝 PGBeeYiKeeper" + tagline) between the two tools (+ Data backup/restore)
electron/main.cjs     ← Electron main process (loads dist/index.html for the desktop exe)
.github/workflows/deploy.yml ← builds + publishes dist/ to GitHub Pages on push to main
```

---

## Commands

```bash
npm run dev            # Start dev server (Vite, port 5173)
npm run build          # Production build → dist/index.html (SINGLE self-contained file,
                       #   via vite-plugin-singlefile + base:'./' — everything inlined)
npm run build:exe      # Build + package a Windows app folder via electron-packager
                       #   → release/PGBeeYiKeeper-win32-x64/PGBeeYiKeeper.exe
npm run build:exe-portable  # Single portable .exe via electron-builder (needs Windows Dev Mode / admin)
npm run electron:dev   # Build + run the Electron app locally
```

When making changes to geneData.js, both tools pick up the update automatically via imports.

---

## Deployment & Distribution

**Live site (GitHub Pages):** https://yizhutlon-coder.github.io/PGBeeYiKeeper/
- Remote: `origin` = https://github.com/yizhutlon-coder/PGBeeYiKeeper.git . Working branch is **`main`**.
- **The deploy loop:** commit → `git push` → `.github/workflows/deploy.yml` builds and publishes
  `dist/` to Pages → live in ~1–2 min. That's the whole thing; no manual build/upload.
- Pages source must be set to **"GitHub Actions"** in repo Settings → Pages (one-time, done in the UI).
- `base: './'` + single-file build means the Pages subpath "just works"; no config changes needed.

**Offline distribution** (frozen snapshots, separate origins from the live site):
- Standalone HTML — `dist/index.html` (the player keeps copies in Downloads, e.g.
  `PGBeeYiKeeper-Version1.1.html`). Chrome/Edge persist `file://` localStorage reliably; Firefox flaky.
- Electron `.exe` — `release/PGBeeYiKeeper-win32-x64/`.

## Data safety (IMPORTANT for testing)
- All state is `localStorage`, **per-origin** — the live site, each standalone HTML, the exe, and the
  dev server are all separate stores. **Data ▾ → Export/Import** moves data between them; there is no
  cross-device/cross-origin sync (no backend).
- **The Claude Preview MCP browser is ephemeral** — its `localStorage` for `localhost:5173` gets
  cleared when the preview server restarts. It is NOT the player's real browser. Do not assume data
  seen there persists across sessions.
- **Committed disk backup:** `pg-genetics-backup-2026-06-11.json` (repo root, commit `e4716fe`) holds
  the player's 12-specimen stable + planner. To restore into a preview for representative testing:
  copy it to `public/restore.json`, `fetch('/restore.json')` in-page, write the `pg-*` keys, reload,
  then delete `public/`. Always back up `pg-v3` to a temp key before any mutating test.

---

## Current status / handoff (end of 2026-06-11 session)
- **Deployed & branded.** App is renamed **PGBeeYiKeeper**, live on GitHub Pages, auto-deploying on push.
  Real live users exist — treat their saves as sacred; only additive/back-compatible localStorage changes.
- **Recent feature work (all committed):** bulk multi-file import; "Show critical genes" toggle
  (Stable + Pairs); hover stat/value coloring + mutation outlines on all gene maps; Pairs
  cross-outcome breakdown (gender-split, pink→red cost gradient) behind the renamed **Detailed cross
  mode** (informational only — never alters the score); `06A2` reclassified std→crit; Data
  backup/restore; **Stable folders + drag-reorder, folder-owned color, cross-tab 📁 tags** (with a
  read-only `pg-tags-v1` legacy-color fallback flagged to retire).
- **Next up (open):** a **visual design pass**. A full design brief + 3 annotated screenshots
  (Stable / Pairs-detailed / Gene-Map) were prepared to hand to a design-focused Claude. Goal:
  consistent type scale, unified card/pill spec, spacing rhythm, stronger hierarchy — staying dark +
  dense. Styling is currently all inline `style={{}}` + the shared `C` token object (no CSS framework);
  a design pass may recommend introducing a lightweight CSS approach.
- No test suite exists; verification is via `npm run build` + the Claude Preview MCP.
