import { useState, useEffect } from 'react';
import { SG } from '../data/geneData.js';
import { classifyPosition, f1ProbR, f1ProbX, simulate } from '../lib/genetics.js';
import { C } from '../lib/theme.js';

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

function Chip({ c, info, av, bv, cat }) {
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
}

// Generation forecast for a project's two parents (Monte Carlo sib-cross sim).
export default function ForecastView({ a, b }) {
  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState(false);
  const [showAll, setShowAll] = useState(false);

  function run() {
    setRunning(true);
    setTimeout(() => {
      const positions = [];
      for (const [c, info] of Object.entries(SG)) {
        if (info.t === 'floor' || info.t === 'orange') continue;
        const av = a.genome[c] || 'D';
        const bv = b.genome[c] || 'D';
        const cat = classifyPosition(av, bv);
        positions.push({ c, info, av, bv, cat, isCrit: info.t === 'crit' || info.t === 'gem' });
      }
      const cats = {};
      for (const p of positions) cats[p.cat] = (cats[p.cat] || 0) + 1;
      const maxAchievable = positions.filter(p => p.cat !== 'neither').length;
      const critNeither = positions.filter(p => p.cat === 'neither' && p.isCrit);
      const stdNeither  = positions.filter(p => p.cat === 'neither' && !p.isCrit);
      const simPositions = positions
        .filter(p => p.cat !== 'neither')
        .map(p => ({ ...p, currentPR: f1ProbR(p.cat), currentPX: f1ProbX(p.cat) }));
      const timeline = simulate(simPositions, 7);
      setPlan({ positions, cats, maxAchievable, critNeither, stdNeither, timeline });
      setRunning(false);
    }, 30);
  }

  // Re-run whenever the parents change (by identity); auto-run on mount.
  useEffect(() => { setPlan(null); run(); /* eslint-disable-next-line */ }, [a?.id, b?.id]);

  if (running || !plan) {
    return (
      <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'18px', fontSize:'13px', color:C.mu }}>
        {running ? 'Running generation forecast…' : 'Preparing forecast…'}
      </div>
    );
  }

  const { positions, maxAchievable, critNeither, timeline } = plan;
  const free     = positions.filter(p => p.cat === 'both_R');
  const easy     = positions.filter(p => ['A_R_B_x','A_x_B_R'].includes(p.cat));
  const diluted  = positions.filter(p => ['A_only','B_only'].includes(p.cat));
  const bothMix  = positions.filter(p => p.cat === 'both_x');
  const atRisk   = positions.filter(p => ['A_x_only','B_x_only'].includes(p.cat));
  const neither  = positions.filter(p => p.cat === 'neither');
  const estGenTarget = timeline.find(t => t.avgR >= maxAchievable * 0.9);
  const critDiluted = diluted.filter(p => p.isCrit);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'8px' }}>
        <div style={{ fontSize:'12px', color:C.mu }}>Monte Carlo projection of sib-crossing <span style={{ color:C.male }}>{a.name}</span> × <span style={{ color:C.female }}>{b.name}</span></div>
        <button onClick={run} style={{ fontSize:'12px', padding:'5px 12px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>Recalculate</button>
      </div>

      {/* Summary */}
      <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px 16px', marginBottom:'12px' }}>
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
          if (!showAll && cat === 'both_R') return null;
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
}
