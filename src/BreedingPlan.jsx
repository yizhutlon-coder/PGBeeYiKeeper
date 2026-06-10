import { useState } from 'react';
import { SG } from './data/geneData.js';
import { parseGenome } from './lib/parser.js';
import { C } from './lib/theme.js';
// ── GENETICS HELPERS ──────────────────────────────────────────────────────────
// Classify what happens at each position when A × B cross
function classifyPosition(a, b) {
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
function f1ProbR(cat) {
  return { both_R:1, A_only:0, B_only:0, A_R_B_x:0.5, A_x_B_R:0.5,
           both_x:0.25, A_x_only:0, B_x_only:0, neither:0 }[cat] ?? 0;
}

// Expected F1 probability of x (mixed) given classification
function f1ProbX(cat) {
  return { both_R:0, A_only:1, B_only:1, A_R_B_x:0.5, A_x_B_R:0.5,
           both_x:0.5, A_x_only:0.5, B_x_only:0.5, neither:0 }[cat] ?? 0;
}

// Monte Carlo: simulate N generations of sib-crossing with best-of-k selection
function simulate(positions, gens, simsPerGen = 12000, litterSize = 8) {
  // positions: array of { cat, isCrit } for each stat gene we care about
  const n = positions.length;
  const results = []; // per generation: { avgR, pct90, pct95 }

  // For each simulation, track the "current best specimen" gene states
  // Start from F1 distribution, then sib-cross

  for (let gen = 0; gen <= gens; gen++) {
    let sumR = 0, above90 = 0, above95 = 0;
    const maxR = n;

    for (let sim = 0; sim < simsPerGen; sim++) {
      // Generate litter of offspring and pick the best
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

      // Update probabilities for next generation based on this specimen
      if (gen === 0) {
        // After first generation, derive probabilities from sib-cross of typical F1 pair
        // This is approximate: assume both parents of F2 look like the F1 average
        for (let i = 0; i < n; i++) {
          positions[i].currentPR = f1ProbR(positions[i].cat) ** 0; // will compute below
          positions[i].currentPX = f1ProbX(positions[i].cat) ** 0;
        }
      }
    }

    // Compute next generation probabilities from sib-cross of best selected F1
    // Best selected F1 has higher R probability than average
    // Approximate: if best selected has state distribution, sib-cross gives:
    // R×R → R, R×x → 50%R+50%x, x×x → 25%R+50%x+25%D, etc.
    // We approximate by using the "best of litter" distribution
    if (gen < gens) {
      for (let i = 0; i < n; i++) {
        const cat = positions[i].cat;
        const pR = gen === 0 ? f1ProbR(cat) : (positions[i].currentPR ?? f1ProbR(cat));
        const pX = gen === 0 ? f1ProbX(cat) : (positions[i].currentPX ?? f1ProbX(cat));
        const pD = Math.max(0, 1 - pR - pX);
        // Sib-cross probabilities
        const nextR = pR*pR + pR*pX + 0.25*pX*pX;
        const nextX = 2*pR*pX*(0.5) + pR*pD + pX*pD + 0.5*pX*pX;
        // With selection boost (approximate): shift toward higher R
        const selBoost = Math.min(0.15, (1-pR) * 0.2); // selection pushes R up
        positions[i].currentPR = Math.min(1, nextR + selBoost);
        positions[i].currentPX = Math.max(0, nextX - selBoost * 0.5);
      }
    }

    results.push({ gen, avgR: sumR / simsPerGen, pct90: above90/simsPerGen*100, pct95: above95/simsPerGen*100 });
  }
  return results;
}

const CAT_INFO = {
  both_R:     { label:'Free (both 〇)',        color:C.std,     bg:C.stdBg,     detail:'Guaranteed in offspring — no work needed.' },
  A_only:     { label:'Only in A (B missing)', color:C.caution, bg:C.cautionBg, detail:'Offspring all ⦿. Need sib-cross to recover.' },
  B_only:     { label:'Only in B (A missing)', color:C.caution, bg:C.cautionBg, detail:'Offspring all ⦿. Need sib-cross to recover.' },
  A_R_B_x:    { label:'A clean, B mixed',      color:C.std,     bg:C.stdBg,     detail:'50% chance 〇 in offspring — likely done in 1 gen.' },
  A_x_B_R:    { label:'A mixed, B clean',      color:C.std,     bg:C.stdBg,     detail:'50% chance 〇 in offspring — likely done in 1 gen.' },
  both_x:     { label:'Both mixed',            color:C.mu,      bg:C.card,      detail:'25% chance 〇 per offspring. ~2 gens with selection.' },
  A_x_only:   { label:'Only in A (mixed)',     color:C.caution, bg:C.cautionBg, detail:'May be lost. Only A has it and as ⦿ only.' },
  B_x_only:   { label:'Only in B (mixed)',     color:C.caution, bg:C.cautionBg, detail:'May be lost. Only B has it and as ⦿ only.' },
  neither:    { label:'Neither parent has it', color:C.danger,  bg:C.dangerBg,  detail:'Cannot be obtained from this cross. Need a 3rd donor.' },
};

export default function BreedingPlan() {
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');
  const [plan, setPlan] = useState(null);
  const [err, setErr] = useState('');
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function generate() {
    if (!inputA.trim() || !inputB.trim()) { setErr('Paste both parent genomes.'); return; }
    try {
      const a = parseGenome(inputA);
      const b = parseGenome(inputB);
      if (!Object.keys(a.genome).length || !Object.keys(b.genome).length) {
        setErr('Could not parse one or both genomes. Check the format.'); return;
      }
      setErr(''); setRunning(true);

      setTimeout(() => {
        // Analyse every stat gene position (skip floor and orange)
        const positions = [];
        for (const [c, info] of Object.entries(SG)) {
          if (info.t === 'floor' || info.t === 'orange') continue;
          const av = a.genome[c] || 'D';
          const bv = b.genome[c] || 'D';
          const cat = classifyPosition(av, bv);
          positions.push({ c, info, av, bv, cat, isCrit: info.t === 'crit' || info.t === 'gem' });
        }

        // Summary counts
        const cats = {};
        for (const p of positions) cats[p.cat] = (cats[p.cat] || 0) + 1;

        const maxAchievable = positions.filter(p => p.cat !== 'neither').length;
        const critNeither = positions.filter(p => p.cat === 'neither' && p.isCrit);
        const stdNeither  = positions.filter(p => p.cat === 'neither' && !p.isCrit);

        // Run simulation on achievable positions
        const simPositions = positions
          .filter(p => p.cat !== 'neither')
          .map(p => ({ ...p, currentPR: f1ProbR(p.cat), currentPX: f1ProbX(p.cat) }));

        const timeline = simulate(simPositions, 7);

        setPlan({ a, b, positions, cats, maxAchievable, critNeither, stdNeither, timeline });
        setRunning(false);
      }, 50);
    } catch(e) { setErr('Error: ' + e.message); setRunning(false); }
  }

  const Chip = ({c, info, av, bv, cat}) => {
    const ci = CAT_INFO[cat];
    return (
      <div title={ci.detail} style={{ background:ci.bg, border:'0.5px solid '+ci.color+'55', borderRadius:'5px', padding:'4px 8px', fontSize:'11px' }}>
        <div style={{ fontFamily:'var(--font-mono)', color: info.t==='crit'?C.crit:ci.color, fontWeight:500, fontSize:'10px' }}>
          {c}{info.t==='crit'?' ★':''}
        </div>
        <div style={{ color:C.mu, fontSize:'10px' }}>{info.s}{info.v>0?' v:'+info.v:''}</div>
        <div style={{ fontSize:'10px', display:'flex', gap:'3px', marginTop:'2px' }}>
          <span style={{ color: av==='R'?C.std:av==='x'?C.caution:C.dim }}>{av==='R'?'〇':av==='x'?'⦿':'⬤'}</span>
          <span style={{ color:C.dim }}>×</span>
          <span style={{ color: bv==='R'?C.std:bv==='x'?C.caution:C.dim }}>{bv==='R'?'〇':bv==='x'?'⦿':'⬤'}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background:C.bg, color:C.tx, fontFamily:'var(--font-sans)', padding:'16px', borderRadius:'12px', minHeight:'100%' }}>
      <div style={{ marginBottom:'14px' }}>
        <div style={{ fontSize:'16px', fontWeight:500, marginBottom:'4px' }}>PG Breeding Plan</div>
        <div style={{ fontSize:'12px', color:C.mu }}>Paste two parent genomes to get a generation-by-generation plan for locking in all available stat genes.</div>
      </div>

      {/* Inputs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px' }}>
        {[['Parent A', inputA, setInputA], ['Parent B', inputB, setInputB]].map(([label, val, set]) => (
          <div key={label}>
            <div style={{ fontSize:'12px', color:C.mu, marginBottom:'4px', fontWeight:500 }}>{label}</div>
            <textarea value={val} onChange={e => set(e.target.value)}
              placeholder={'[Overview]\nEntity=Name\n\n[Genes]\n01= RDRD ...'}
              style={{ width:'100%', height:'120px', fontFamily:'var(--font-mono)', fontSize:'11px', padding:'8px', boxSizing:'border-box', resize:'vertical', borderRadius:'7px', border:'0.5px solid '+C.b, background:C.sf, color:C.tx, outline:'none', lineHeight:1.5 }}
            />
          </div>
        ))}
      </div>

      {err && <p style={{ color:C.danger, fontSize:'12px', margin:'0 0 8px' }}>{err}</p>}
      <button onClick={generate} disabled={running}
        style={{ padding:'7px 20px', fontSize:'13px', cursor: running?'wait':'pointer', opacity: running?0.6:1, marginBottom:'18px' }}>
        {running ? 'Calculating...' : 'Generate Plan'}
      </button>

      {plan && (() => {
        const { a, b, positions, maxAchievable, critNeither, stdNeither, timeline } = plan;
        const free     = positions.filter(p => p.cat === 'both_R');
        const easy     = positions.filter(p => ['A_R_B_x','A_x_B_R'].includes(p.cat));
        const diluted  = positions.filter(p => ['A_only','B_only'].includes(p.cat));
        const bothMix  = positions.filter(p => p.cat === 'both_x');
        const atRisk   = positions.filter(p => ['A_x_only','B_x_only'].includes(p.cat));
        const neither  = positions.filter(p => p.cat === 'neither');

        const finalGen = timeline[timeline.length-1];
        const estGenTarget = timeline.find(t => t.avgR >= maxAchievable * 0.9);
        const critDiluted = diluted.filter(p => p.isCrit);

        return (
          <div>
            {/* Header */}
            <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'14px', fontWeight:500, marginBottom:'10px' }}>
                <span style={{ color:'#60A5FA' }}>{a.name}</span>
                <span style={{ color:C.mu, margin:'0 8px' }}>×</span>
                <span style={{ color:'#F472B6' }}>{b.name}</span>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[
                  ['Max achievable', maxAchievable, C.tx],
                  ['Free (both 〇)', free.length, C.std],
                  ['Need work', diluted.length + bothMix.length + easy.length, C.caution],
                  ['At risk', atRisk.length, C.caution],
                  ['Impossible', neither.length, C.danger],
                ].map(([label, val, color]) => (
                  <div key={label} style={{ background:C.sf, borderRadius:'7px', padding:'8px 12px', textAlign:'center', flex:'1 1 90px' }}>
                    <div style={{ fontSize:'20px', fontWeight:500, color }}>{val}</div>
                    <div style={{ fontSize:'11px', color:C.mu }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical warnings */}
            {critDiluted.length > 0 && (
              <div style={{ background:C.dangerBg, border:'0.5px solid '+C.danger, borderRadius:'8px', padding:'10px 12px', marginBottom:'10px', fontSize:'12px' }}>
                <div style={{ fontWeight:600, color:C.danger, marginBottom:'6px' }}>Critical genes that will be diluted in F1 (one parent is ⬤)</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {critDiluted.map(p => (
                    <span key={p.c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:'#2A0808', color:C.danger, padding:'2px 6px', borderRadius:'3px' }}>
                      {p.c} ({p.info.s}) — {p.cat === 'A_only' ? 'B missing' : 'A missing'}
                    </span>
                  ))}
                </div>
                <div style={{ color:C.mu, marginTop:'6px', fontSize:'11px' }}>These become ⦿ in all F1 offspring. Require sib-crossing to recover. Screen carefully.</div>
              </div>
            )}
            {critNeither.length > 0 && (
              <div style={{ background:'#180505', border:'0.5px solid #5A1010', borderRadius:'8px', padding:'10px 12px', marginBottom:'10px', fontSize:'12px' }}>
                <div style={{ fontWeight:600, color:'#C07070', marginBottom:'6px' }}>Critical genes neither parent has — need a 3rd donor</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {critNeither.map(p => (
                    <span key={p.c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:'#1A0505', color:'#C07070', padding:'2px 6px', borderRadius:'3px' }}>{p.c} ({p.info.s})</span>
                  ))}
                </div>
              </div>
            )}

            {/* Generation timeline */}
            <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:500, marginBottom:'10px' }}>
                Generation timeline — sib-crossing with best-of-{8} selection
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                  <thead>
                    <tr style={{ color:C.mu, borderBottom:'0.5px solid '+C.b }}>
                      {['Generation','Step','Avg genes 〇','90% threshold','95% threshold','Progress'].map(h => (
                        <th key={h} style={{ padding:'4px 8px', textAlign:'left', fontWeight:400, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {timeline.map((t, i) => {
                      const pct = t.avgR / maxAchievable;
                      const steps = ['A × B → F1 offspring','Sib-cross F1 × F1 sibling','Sib-cross best F2 × F2','Sib-cross best F3 × F3','Sib-cross best F4 × F4','Sib-cross best F5 × F5','Sib-cross best F6 × F6','Sib-cross best F7 × F7'];
                      const barW = Math.round(pct * 100);
                      const barColor = pct >= 0.95 ? C.std : pct >= 0.8 ? C.caution : C.mu;
                      return (
                        <tr key={i} style={{ borderBottom:'0.5px solid '+C.dim+'44', background: i%2===0?'transparent':C.sf+'44' }}>
                          <td style={{ padding:'6px 8px', fontWeight:500, color: pct>=0.9?C.std:C.tx }}>{i === 0 ? 'F1' : 'F'+i}</td>
                          <td style={{ padding:'6px 8px', color:C.mu, fontSize:'11px' }}>{steps[i]}</td>
                          <td style={{ padding:'6px 8px', color:barColor, fontWeight:500 }}>{t.avgR.toFixed(1)} / {maxAchievable}</td>
                          <td style={{ padding:'6px 8px', color:C.mu }}>{t.pct90.toFixed(0)}%</td>
                          <td style={{ padding:'6px 8px', color:C.mu }}>{t.pct95.toFixed(0)}%</td>
                          <td style={{ padding:'6px 8px', minWidth:'80px' }}>
                            <div style={{ background:C.dim+'44', borderRadius:'3px', overflow:'hidden', height:'8px' }}>
                              <div style={{ width:barW+'%', height:'100%', background:barColor, borderRadius:'3px', transition:'width 0.3s' }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop:'10px', fontSize:'12px', color:C.mu, lineHeight:1.7 }}>
                {estGenTarget
                  ? <>Expect to reach 90% of available genes locked by <strong style={{ color:C.std }}>generation F{estGenTarget.gen}</strong>.</>
                  : <>Full convergence takes more than 7 generations — consider improving one parent first.</>
                }
                {' '}Simulation uses {(8).toLocaleString()}-offspring litter with best selection each generation.
              </div>
            </div>

            {/* Action plan */}
            <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
              <div style={{ fontSize:'13px', fontWeight:500, marginBottom:'10px' }}>Step-by-step plan</div>
              {[
                { step:'1', title:'Initial cross', desc:`Breed ${a.name} × ${b.name}. Produce at least 8 offspring and read all genomes. Select the offspring with the most 〇 genes, prioritising critical positions.`, color:C.crit },
                { step:'2', title:`Sib-cross F1 pairs (${free.length + diluted.length + bothMix.length + easy.length} positions to resolve)`,
                  desc: `Pick the two best F1 offspring and breed them together. Repeat each generation, always selecting the offspring with the most critical 〇 genes. ${diluted.length > 0 ? `Watch especially for the ${diluted.length} position${diluted.length>1?'s':''} that went to ⦿ in F1 — these need to randomly recombine back to 〇 (25% per position per generation).` : ''}`,
                  color:C.caution },
                { step:'3', title:`Continue until stable (~F${estGenTarget?.gen ?? '5+'}+)`,
                  desc:`Keep sib-crossing and selecting best offspring. By F${(estGenTarget?.gen ?? 5) + 1}–F${(estGenTarget?.gen ?? 5) + 2} you should have a specimen with the vast majority of available genes locked as 〇.`,
                  color:C.std },
                ...(neither.length > 0 ? [{ step:'4', title:`Source missing genes separately (${neither.length} positions)`,
                  desc:`${critNeither.length > 0 ? critNeither.map(p=>`${p.c} (${p.info.s})`).join(', ') + ' cannot come from this cross. ' : ''}These require a fold-in from a wild or different line specimen.`,
                  color:C.danger }] : []),
              ].map(({ step, title, desc, color }) => (
                <div key={step} style={{ display:'flex', gap:'10px', marginBottom:'12px' }}>
                  <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:C.sf, border:'0.5px solid '+color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:500, color, flexShrink:0, marginTop:'1px' }}>{step}</div>
                  <div>
                    <div style={{ fontSize:'13px', fontWeight:500, color, marginBottom:'3px' }}>{title}</div>
                    <div style={{ fontSize:'12px', color:C.mu, lineHeight:1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gene breakdown */}
            <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <div style={{ fontSize:'13px', fontWeight:500 }}>Full gene breakdown</div>
                <button onClick={() => setShowAll(v => !v)} style={{ fontSize:'12px', padding:'4px 10px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'5px' }}>
                  {showAll ? 'Hide easy genes' : 'Show all'}
                </button>
              </div>
              {Object.entries(CAT_INFO).map(([cat, ci]) => {
                const items = positions.filter(p => p.cat === cat);
                if (!items.length) return null;
                if (!showAll && cat === 'both_R') return null; // hide the free ones by default
                return (
                  <div key={cat} style={{ marginBottom:'10px' }}>
                    <div style={{ fontSize:'11px', fontWeight:500, color:ci.color, marginBottom:'5px', display:'flex', gap:'6px', alignItems:'center' }}>
                      <span>{ci.label}</span>
                      <span style={{ color:C.mu, fontWeight:400 }}>({items.length})</span>
                      <span style={{ fontSize:'10px', color:C.dim, fontWeight:400 }}>{ci.detail}</span>
                    </div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                      {items.map(p => <Chip key={p.c} {...p} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

