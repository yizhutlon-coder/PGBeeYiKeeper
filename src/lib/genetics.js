import { SG, W, STAT_COORDS } from '../data/geneData.js';

// ── CROSS MATH ────────────────────────────────────────────────────────────────
// Expected probability of R (〇) in offspring for a single position
export function expR(a, b) {
  if (!a || !b || a === '?' || b === '?') return 0;
  return ({ RR:1, Rx:0.5, xR:0.5, xx:0.25, DR:0, RD:0, Dx:0, xD:0, DD:0 })[[a,b].sort().join('')] ?? 0;
}

// Simple crit-vs-std weight used by the planner
export function tierWeight(info) {
  return info.t === 'crit' ? 5 : 1;
}

// ── SPECIMEN STATS (Calculator) ───────────────────────────────────────────────
export function calcStats(s) {
  let score = 0, critR = 0, stdR = 0, mixed = 0;
  for (const [c, info] of Object.entries(SG)) {
    if (info.t === 'floor') continue;
    // orange genes always included (paramount tier)
    const v = s.genome[c] || 'D';
    const w = W[info.t] || 1;
    if (v === 'R') { score += w; (info.t === 'crit' || info.t === 'gem') ? critR++ : stdR++; }
    if (v === 'x') mixed++;
  }
  return { score, critR, stdR, mixed };
}

// ── PAIR SCORING (Calculator) ─────────────────────────────────────────────────
// expand=false → clarification mode: maximise expected 〇 in offspring
// expand=true  → expansion mode: rank by what this male specifically lacks
export function scorePair(m, f, expand, cov) {
  let score = 0;
  for (const [c, info] of Object.entries(SG)) {
    if (info.t === 'floor') continue;
    // orange genes always included (paramount tier)
    const w = W[info.t] || 1;
    const ms = m.genome[c] || 'D';
    const fs = f.genome[c] || 'D';

    if (!expand) {
      // ── CLARIFICATION MODE: maximise expected 〇 in offspring ──
      score += expR(ms, fs) * w;
    } else {
      // ── EXPANSION MODE: rank by what this male specifically lacks ──
      if (ms === 'R') {
        // Male already has it clean — minimal credit
        score += expR(ms, fs) * w * 0.1;
      } else if (ms === 'x') {
        // Male has it mixed — reward female helping resolve it
        score += expR(ms, fs) * w;
      } else {
        // Male lacks it entirely — big bonus if female carries it
        if (fs === 'R')      score += w * 3;    // female has clean recessive
        else if (fs === 'x') score += w * 1.5;  // female has mixed — still a fold-in
      }
    }
  }
  return score;
}

export function getTopPairs(specimens, expand, cov) {
  const males = specimens.filter(s => s.gender === 'male');
  const females = specimens.filter(s => s.gender === 'female');
  const all = [];
  for (const m of males) for (const f of females) all.push({ m, f, score: scorePair(m, f, expand, cov) });
  return all.sort((a,b) => b.score - a.score);
}

// ── DELETION RECOMMENDATIONS (Calculator) ─────────────────────────────────────
export function getDelList(specimens) {
  return specimens.map(s => {
    const critR = [], uniq = [];
    for (const [c, info] of Object.entries(SG)) {
      if (info.t !== 'crit' && info.t !== 'gem') continue;
      if ((s.genome[c] || 'D') !== 'R') continue;
      critR.push({ c, stat: info.s });
      if (!specimens.some(o => o.id !== s.id && (o.genome[c]||'D') === 'R')) uniq.push({ c, stat: info.s });
    }
    const { score } = calcStats(s, false);
    const isOnly = s.gender !== 'unknown' && specimens.filter(o => o.id !== s.id && o.gender === s.gender).length === 0;
    const risk = uniq.length > 0 ? 'danger' : (isOnly || critR.length > 0) ? 'caution' : 'safe';
    return { s, critR, uniq, score, risk, isOnly };
  }).sort((a,b) => ({ safe:0, caution:1, danger:2 }[a.risk] - { safe:0, caution:1, danger:2 }[b.risk] || a.score - b.score));
}

// ── COVERAGE MAP (Calculator) ─────────────────────────────────────────────────
// Returns per-position best state across all specimens, plus summary counts.
// best: 'R' = at least one specimen has 〇 | 'x' = has ⦿ but no 〇 | 'D' = all ⬤
export function getCoverage(specimens) {
  const cov = {};
  let critTotal=0, critCov=0, critProg=0;
  let stdTotal=0,  stdCov=0,  stdProg=0;

  for (const [c, info] of Object.entries(SG)) {
    const isOrange = info.t === 'orange';
    // orange genes always included in coverage
    const isCrit = info.t === 'crit' || info.t === 'gem';
    const isFloor = info.t === 'floor';
    if (isFloor) { cov[c] = { best:'floor', info }; continue; }

    let best = 'D';
    for (const s of specimens) {
      const v = s.genome[c] || 'D';
      if (v === 'R') { best = 'R'; break; }
      if (v === 'x') best = 'x';
    }
    cov[c] = { best, info };
    if (isCrit) { critTotal++; if (best==='R') critCov++; else if (best==='x') critProg++; }
    else        { stdTotal++;  if (best==='R') stdCov++;  else if (best==='x') stdProg++;  }
  }
  return { cov, critTotal, critCov, critProg, stdTotal, stdCov, stdProg };
}

// ── POOL SCORING (Planner) ────────────────────────────────────────────────────
// Pair score weighted by pool-wide need: genes the pool lacks rank higher
export function scorePairPool(m, f, allSpecs) {
  let score = 0;
  for (const [c, info] of STAT_COORDS) {
    const w = tierWeight(info);
    const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
    const poolBest = allSpecs.reduce((b,s) => {
      const v = s.genome[c]||'D'; return v==='R'?'R':v==='x'&&b==='D'?'x':b;
    }, 'D');
    const priority = poolBest==='R' ? 0.6 : poolBest==='x' ? 1.2 : 2.0;
    const er = expR(ms, fs);
    if (er > 0) score += er * w * priority;
    if ((ms==='R'&&fs==='D')||(ms==='D'&&fs==='R')) score -= w * 0.25;
  }
  return score;
}

export function specimenScore(s) {
  return STAT_COORDS.reduce((acc,[c,info]) => acc + ((s.genome[c]||'D')==='R' ? tierWeight(info) : 0), 0);
}

// Per-position best state across a pool ('R' | 'x' | 'D'), stat coords only
export function poolCoverage(pool) {
  const cov = {};
  for (const [c] of STAT_COORDS) {
    let best = 'D';
    for (const s of pool) {
      const v = s.genome[c]||'D';
      if (v==='R') { best='R'; break; }
      if (v==='x') best='x';
    }
    cov[c] = best;
  }
  return cov;
}
