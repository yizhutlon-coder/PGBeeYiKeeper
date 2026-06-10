import { useState } from 'react';
import { SG, SYM, CRS, GROUPS } from '../data/geneData.js';
import { poolCoverage } from '../lib/genetics.js';
import { C, symCol } from '../lib/theme.js';

// ── GENE COVERAGE MAP ─────────────────────────────────────────────────────────
// Pool-wide chromosome heatmap: best state per position across all specimens.
export default function CoverageMap({ allSpecs }) {
  const [hov, setHov] = useState(null);
  const cov = poolCoverage(allSpecs);
  const chrMax = {};
  for (const cr of CRS) chrMax[cr] = 0;
  for (const c of Object.keys(SG)) { const cr=c.slice(0,2),gi=c.charCodeAt(2)-65; if(chrMax[cr]!==undefined) chrMax[cr]=Math.max(chrMax[cr],gi); }

  function cs(coord) {
    const info=SG[coord]; if(!info) return null;
    if(info.t==='floor') return {dot:'#0C4A30',border:'#1A5030'};
    if(info.t==='orange') return {dot:'#4A2800',border:'#6A3800'};
    const state=cov[coord]||'D', isCrit=info.t==='crit';
    if(state==='R') return {dot:C.std, border:isCrit?C.crit:C.std+'88', bright:true};
    if(state==='x') return {dot:C.caution, border:C.caution+'55'};
    return {dot:isCrit?'#3A1010':'#1A1A1A', border:isCrit?C.danger+'44':C.dim+'33'};
  }
  const hi=hov?SG[hov]:null, hs=hov?(cov[hov]||'D'):null;
  return (
    <div>
      <div style={{minHeight:'22px',marginBottom:'6px',fontSize:'11px',color:C.mu}}>
        {hov&&hi ? <span><span style={{fontFamily:'var(--font-mono)',color:C.crit}}>{hov}</span><span style={{margin:'0 6px'}}>{hi.s}{hi.t==='crit'?' (crit)':''}</span><span style={{color:symCol(hs)}}>{SYM[hs]} pool best</span></span> : 'Hover for details'}
      </div>
      <div style={{overflowX:'auto'}}>
        <div style={{minWidth:'fit-content'}}>
          <div style={{display:'flex',gap:'3px',paddingLeft:'32px',marginBottom:'3px'}}>
            {GROUPS.map(g=><div key={g} style={{width:'62px',fontSize:'9px',color:C.mu,fontFamily:'var(--font-mono)',textAlign:'center',flexShrink:0}}>{g}</div>)}
          </div>
          {CRS.map(cr=>(
            <div key={cr} style={{display:'flex',alignItems:'center',gap:'3px',marginBottom:'2px'}}>
              <div style={{width:'28px',fontSize:'9px',color:C.mu,fontFamily:'var(--font-mono)',textAlign:'right',paddingRight:'4px',flexShrink:0}}>CR{cr}</div>
              {GROUPS.map((g,gi)=>(
                <div key={g} style={{display:'flex',gap:'2px',width:'62px',flexShrink:0,opacity:gi<=(chrMax[cr]??0)?1:0.1}}>
                  {[1,2,3,4].map(p=>{
                    const coord=cr+g+p, cell=cs(coord);
                    if(!cell) return <div key={p} style={{width:'12px',height:'12px',borderRadius:'2px',background:'#0D0F18',border:'0.5px solid #1A1E2F',flexShrink:0}}/>;
                    return (
                      <div key={p} onMouseEnter={()=>setHov(coord)} onMouseLeave={()=>setHov(null)}
                        style={{width:'12px',height:'12px',borderRadius:'2px',background:C.card,border:'0.5px solid '+cell.border,flexShrink:0,cursor:'default',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:hov===coord?'0 0 0 1.5px #fff4':'none'}}>
                        {cell.dot&&<div style={{width:'6px',height:'6px',borderRadius:'1px',background:cell.dot,opacity:cell.bright?1:0.85}}/>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:'10px',marginTop:'7px',fontSize:'10px',color:C.mu,flexWrap:'wrap'}}>
        {[['#34D399','Locked (〇 somewhere)'],['#FCD34D','In progress (⦿ only)'],['#3A1010','Missing — crit'],['#1A1A1A','Missing — std']].map(([col,lbl])=>(
          <div key={lbl} style={{display:'flex',alignItems:'center',gap:'4px'}}><div style={{width:'10px',height:'10px',borderRadius:'2px',background:col,flexShrink:0}}/>{lbl}</div>
        ))}
      </div>
    </div>
  );
}
