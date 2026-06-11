# Project Gorgon — Arthropod Genetics Toolset

## What this project is
A suite of React tools for breeding arthropods (bees/wasps) in the game Project Gorgon.
The player (ThatYiGuy) has MAX Genetics skill, meaning they can read exact genome states.
The goal is to breed specimens where all stat genes are recessive (〇), which gives stat bonuses.

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
- 🟡 **Standard (std)** — CR01–CR05, CR06A2, CR09C–E. Normal stat genes. Weight = 1×
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
- `06A2` = V (Versatility) **std** v:7 — was reclassified from crit to std
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
**Tabs:** Import | Stable | Pairs | Manage | Gene Map | Analyze

**Key features:**
- Import: two-step (paste → parse → gender dropdown per specimen)
- Stable: specimen cards with inline rename, delete with confirmation modal
- Pairs: male-first browsing — click a male to see all females ranked. Each female shows 4 pills: clarifies N, fold-in N crit+std, mixes N, +N new to pool
- Manage: deletion recommendations, color tag system (4 colors), "not paired" badge
- Gene Map: chromosome heatmap CR01–CR09
- Analyze: paste genome to preview vs stable without adding; gender dropdown before adding

**Storage key:** `pg-v3` (localStorage)

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
  the project's two parents — generation timeline (avg 〇/gen, 90%/95% thresholds), max
  achievable, and feasibility flags (diluted crits, "neither parent has it → need 3rd donor").
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
    theme.js          ← shared color palette (C) + symCol
  components/
    CoverageMap.jsx   ← Shared chromosome heatmap
    ImportPanel.jsx   ← Shared specimen import: paste an export OR pick from the Calculator stable (pg-v3), with gender + generation dropdowns
    ForecastView.jsx  ← Monte Carlo generation forecast (Planner's Forecast tab)
  Calculator.jsx      ← Main stable manager (pg-v3)
  Planner.jsx         ← Sib-cross multi-project planner (+ Forecast tab)
  App.jsx             ← Navigation between the two tools
```

---

## Commands

```bash
npm run dev        # Start dev server (Vite)
npm run build      # Production build
```

When making changes to geneData.js, both tools pick up the update automatically via imports.
