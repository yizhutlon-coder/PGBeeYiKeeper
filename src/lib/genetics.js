import { SG, W, STAT_COORDS } from '../data/geneData.js';

// ── CROSS MATH ────────────────────────────────────────────────────────────────
// Expected probability of R (〇) in offspring for a single position
export function expR(a, b) {
  if (!a || !b || a === '?' || b === '?') return 0;
  return ({ RR:1, Rx:0.5, xR:0.5, xx:0.25, DR:0, RD:0, Dx:0, xD:0, DD:0 })[[a,b].sort().join('')] ?? 0;
}

// Simple crit-vs-std weight used by the planner
export function tierWeight(info) {
  return info.t === 'crit' ? 3 : 1;
}

// ── SPECIMEN STATS (Calculator) ───────────────────────────────────────────────
export function calcStats(s) {
  let score = 0, critR = 0, stdR = 0, mutR = 0, mixed = 0;
  for (const [c, info] of Object.entries(SG)) {
    if (info.t === 'floor') continue;
    // orange genes always included (paramount tier)
    const v = s.genome[c] || 'D';
    const w = W[info.t] || 1;
    if (v === 'R') {
      score += w;
      if (info.t === 'crit' || info.t === 'gem') critR++;
      else if (info.t === 'orange') mutR++;   // mutation-only paramount gene as 〇 — super rare
      else stdR++;
    }
    if (v === 'x') mixed++;
  }
  return { score, critR, stdR, mutR, mixed };
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
  let mutTotal=0,  mutCov=0,  mutProg=0;   // orange / paramount (mutation-only) tier

  for (const [c, info] of Object.entries(SG)) {
    const isOrange = info.t === 'orange';
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
    if (isCrit)        { critTotal++; if (best==='R') critCov++; else if (best==='x') critProg++; }
    else if (isOrange) { mutTotal++;  if (best==='R') mutCov++;  else if (best==='x') mutProg++;  }
    else               { stdTotal++;  if (best==='R') stdCov++;  else if (best==='x') stdProg++;  }
  }
  return { cov, critTotal, critCov, critProg, stdTotal, stdCov, stdProg, mutTotal, mutCov, mutProg };
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

// ── FORECAST (two-parent generation projection) ───────────────────────────────
// Classify what happens at each position when parents A × B are crossed.
export function classifyPosition(a, b) {
  const norm = v => (v === '?' ? 'D' : v); // treat unknown as dominant (conservative)
  const av = norm(a), bv = norm(b);
  if (av === 'R' && bv === 'R') return 'both_R';      // guaranteed 〇 in F1
  if (av === 'R' && bv === 'D') return 'A_only';       // A diluted in F1 → all ⦿
  if (av === 'D' && bv === 'R') return 'B_only';       // B diluted in F1 → all ⦿
  if (av === 'R' && bv === 'x') return 'A_R_B_x';      // 50% R in F1
  if (av === 'x' && bv === 'R') return 'A_x_B_R';      // 50% R in F1
  if (av === 'x' && bv === 'x') return 'both_x';       // 25% R in F1
  if (av === 'x' && bv === 'D') return 'A_x_only';     // 50% x in F1, at risk
  if (av === 'D' && bv === 'x') return 'B_x_only';     // 50% x in F1, at risk
  return 'neither';                                      // both D — can't get from this cross
}

// Expected F1 probability of R given position classification
export function f1ProbR(cat) {
  return { both_R:1, A_only:0, B_only:0, A_R_B_x:0.5, A_x_B_R:0.5,
           both_x:0.25, A_x_only:0, B_x_only:0, neither:0 }[cat] ?? 0;
}

// Expected F1 probability of x (mixed) given classification
export function f1ProbX(cat) {
  return { both_R:0, A_only:1, B_only:1, A_R_B_x:0.5, A_x_B_R:0.5,
           both_x:0.5, A_x_only:0.5, B_x_only:0.5, neither:0 }[cat] ?? 0;
}

// Monte Carlo: simulate N generations of sib-crossing with best-of-k selection.
// Returns per-generation { gen, avgR, pct90, pct95 }.
export function simulate(positions, gens, simsPerGen = 12000, litterSize = 8) {
  const n = positions.length;
  const results = [];

  for (let gen = 0; gen <= gens; gen++) {
    let sumR = 0, above90 = 0, above95 = 0;
    const maxR = n;

    for (let sim = 0; sim < simsPerGen; sim++) {
      let bestR = -1, bestSpec = null;

      for (let off = 0; off < litterSize; off++) {
        const spec = new Array(n);
        for (let i = 0; i < n; i++) {
          const cat = positions[i].cat;
          const pR = gen === 0 ? f1ProbR(cat) : positions[i].currentPR ?? f1ProbR(cat);
          const pX = gen === 0 ? f1ProbX(cat) : positions[i].currentPX ?? f1ProbX(cat);
          const r = Math.random();
          if (r < pR) spec[i] = 'R';
          else if (r < pR + pX) spec[i] = 'x';
          else spec[i] = 'D';
        }
        const rCount = spec.filter((v,i) => v==='R').length +
                       spec.filter((v,i) => v==='R' && positions[i].isCrit).length * 2; // weight crits
        if (rCount > bestR) { bestR = rCount; bestSpec = spec; }
      }

      const actualR = bestSpec.filter(v => v==='R').length;
      sumR += actualR;
      if (actualR >= maxR * 0.9) above90++;
      if (actualR >= maxR * 0.95) above95++;
    }

    if (gen < gens) {
      for (let i = 0; i < n; i++) {
        const cat = positions[i].cat;
        const pR = gen === 0 ? f1ProbR(cat) : (positions[i].currentPR ?? f1ProbR(cat));
        const pX = gen === 0 ? f1ProbX(cat) : (positions[i].currentPX ?? f1ProbX(cat));
        const pD = Math.max(0, 1 - pR - pX);
        const nextR = pR*pR + pR*pX + 0.25*pX*pX;
        const nextX = 2*pR*pX*(0.5) + pR*pD + pX*pD + 0.5*pX*pX;
        const selBoost = Math.min(0.15, (1-pR) * 0.2); // selection pushes R up
        positions[i].currentPR = Math.min(1, nextR + selBoost);
        positions[i].currentPX = Math.max(0, nextX - selBoost * 0.5);
      }
    }

    results.push({ gen, avgR: sumR / simsPerGen, pct90: above90/simsPerGen*100, pct95: above95/simsPerGen*100 });
  }
  return results;
}
