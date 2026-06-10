import { useState, useEffect } from 'react';
import { storage } from './lib/storage.js';

const CRS = ['01','02','03','04','05','06','07','08','09'];
const GROUPS = 'ABCDEFGHIJ'.split('');
const STATS = ['T','Fe','Fr','Ru','En','V','I'];

const TYPES = [
  { id:'none',   label:'None',          bg:'#0D0F18', border:'#1A1E2F', bright:null,      text:null      },
  { id:'std',    label:'Standard',      bg:'#082010', border:'#1A5030', bright:'#34D399', text:'#34D399' },
  { id:'crit',   label:'Critical ★',   bg:'#1A1200', border:'#5A3A00', bright:'#F59E0B', text:'#F59E0B' },
  { id:'floor',  label:'Floor (∞R)',    bg:'#030C22', border:'#1A3060', bright:'#60A5FA', text:'#60A5FA' },
  { id:'orange', label:'Mutation (D)',  bg:'#180B00', border:'#5A3000', bright:'#F97316', text:'#F97316' },
];

// Pre-loaded from the current app SG database (all corrections applied so far)
const BASE = {
  '01A1':{type:'std',stat:'T',value:0},'01A2':{type:'std',stat:'T',value:0},
  '01B1':{type:'std',stat:'Fr',value:0},'01B2':{type:'std',stat:'Ru',value:0},'01B3':{type:'std',stat:'Fe',value:0},
  '01C1':{type:'std',stat:'En',value:0},'01C2':{type:'std',stat:'V',value:0},
  '01D1':{type:'std',stat:'T',value:0},'01D2':{type:'std',stat:'Fr',value:0},'01D3':{type:'floor',stat:'Fr',value:0},
  '01E2':{type:'std',stat:'I',value:0},'01E3':{type:'std',stat:'En',value:0},
  '01F1':{type:'std',stat:'I',value:0},'01F2':{type:'std',stat:'V',value:0},'01F3':{type:'std',stat:'Ru',value:0},
  '01G1':{type:'std',stat:'En',value:0},'01G2':{type:'std',stat:'T',value:0},'01G3':{type:'orange',stat:'V',value:0},'01G4':{type:'orange',stat:'',value:0},
  '01H1':{type:'std',stat:'Fr',value:0},'01H3':{type:'std',stat:'Fe',value:0},'01H4':{type:'std',stat:'Ru',value:0},
  '01I1':{type:'orange',stat:'Fe',value:0},
  '01J1':{type:'std',stat:'V',value:0},'01J2':{type:'std',stat:'I',value:0},
  '02A1':{type:'std',stat:'T',value:0},'02A3':{type:'std',stat:'Ru',value:0},
  '02B2':{type:'std',stat:'I',value:0},'02B3':{type:'std',stat:'Fe',value:0},'02B4':{type:'std',stat:'Fr',value:0},
  '02C1':{type:'std',stat:'V',value:0},'02C3':{type:'std',stat:'En',value:0},'02C4':{type:'std',stat:'Ru',value:0},
  '02D2':{type:'std',stat:'En',value:0},'02D3':{type:'std',stat:'T',value:0},
  '02E1':{type:'std',stat:'Fe',value:0},'02E2':{type:'orange',stat:'I',value:0},'02E4':{type:'std',stat:'I',value:0},
  '03A1':{type:'std',stat:'V',value:0},'03A4':{type:'floor',stat:'Fe',value:0},
  '03B3':{type:'floor',stat:'Fe',value:0},'03B4':{type:'floor',stat:'T',value:0},
  '03C1':{type:'std',stat:'Ru',value:0},'03C2':{type:'std',stat:'En',value:0},
  '03D1':{type:'floor',stat:'Fr',value:0},'03D3':{type:'floor',stat:'Fe',value:0},
  '03E1':{type:'std',stat:'T',value:0},'03E3':{type:'std',stat:'I',value:0},'03E4':{type:'std',stat:'Ru',value:0},
  '03F1':{type:'std',stat:'T',value:0},'03F3':{type:'orange',stat:'Ru',value:0},
  '03G1':{type:'std',stat:'Fe',value:0},'03G2':{type:'std',stat:'V',value:0},'03G3':{type:'orange',stat:'',value:0},'03G4':{type:'orange',stat:'',value:0},
  '03H1':{type:'std',stat:'Fr',value:0},'03H2':{type:'std',stat:'Fr',value:0},
  '03I1':{type:'orange',stat:'I',value:0},'03I2':{type:'orange',stat:'V',value:0},'03I3':{type:'std',stat:'Fe',value:0},'03I4':{type:'orange',stat:'I',value:0},
  '03J4':{type:'std',stat:'I',value:0},
  '04A1':{type:'orange',stat:'V',value:0},
  '04B1':{type:'std',stat:'T',value:0},'04B2':{type:'floor',stat:'Fr',value:0},'04B3':{type:'std',stat:'Fe',value:0},
  '04C1':{type:'std',stat:'I',value:0},'04C2':{type:'std',stat:'V',value:0},'04C3':{type:'std',stat:'Ru',value:0},
  '04D1':{type:'floor',stat:'Ru',value:0},'04D2':{type:'floor',stat:'En',value:0},'04D3':{type:'std',stat:'En',value:0},
  '04E1':{type:'std',stat:'I',value:0},'04E2':{type:'orange',stat:'I',value:0},'04E3':{type:'orange',stat:'Fe',value:0},
  '05A2':{type:'std',stat:'Fr',value:0},'05A3':{type:'std',stat:'En',value:0},
  '05B1':{type:'std',stat:'I',value:0},'05B2':{type:'std',stat:'I',value:0},'05B3':{type:'std',stat:'Fr',value:0},'05B4':{type:'std',stat:'Fe',value:0},
  '05C3':{type:'std',stat:'T',value:0},
  '06A1':{type:'crit',stat:'T',value:0},'06A2':{type:'crit',stat:'V',value:0},'06A3':{type:'crit',stat:'Fe',value:0},
  '06B1':{type:'crit',stat:'Ru',value:0},'06B2':{type:'crit',stat:'Fr',value:0},'06B3':{type:'crit',stat:'Fe',value:0},'06B4':{type:'crit',stat:'T',value:0},
  '06C2':{type:'crit',stat:'Ru',value:0},
  '07A1':{type:'crit',stat:'I',value:0},'07A3':{type:'crit',stat:'Ru',value:0},
  '07B1':{type:'crit',stat:'En',value:0},'07B2':{type:'crit',stat:'T',value:0},'07B4':{type:'crit',stat:'En',value:0},
  '07C1':{type:'crit',stat:'Ru',value:0},'07C2':{type:'crit',stat:'Fr',value:0},'07C3':{type:'crit',stat:'V',value:0},
  '07D1':{type:'crit',stat:'T',value:0},'07D2':{type:'crit',stat:'Fe',value:0},'07D4':{type:'crit',stat:'I',value:0},
  '07E1':{type:'crit',stat:'Fr',value:0},'07E2':{type:'crit',stat:'Ru',value:0},'07E3':{type:'crit',stat:'En',value:0},'07E4':{type:'crit',stat:'Fr',value:0},
  '07F1':{type:'crit',stat:'En',value:0},'07F2':{type:'crit',stat:'Fr',value:0},
  '07G1':{type:'crit',stat:'Ru',value:0},'07G2':{type:'crit',stat:'I',value:0},'07G3':{type:'crit',stat:'V',value:0},'07G4':{type:'crit',stat:'Fr',value:0},
  '07H1':{type:'crit',stat:'T',value:0},'07H2':{type:'crit',stat:'En',value:0},'07H3':{type:'crit',stat:'V',value:0},
  '07I1':{type:'crit',stat:'Fe',value:0},'07I2':{type:'crit',stat:'En',value:0},'07I3':{type:'crit',stat:'T',value:0},
  '07J1':{type:'crit',stat:'Ru',value:0},'07J2':{type:'crit',stat:'Fr',value:0},'07J3':{type:'crit',stat:'Ru',value:0},'07J4':{type:'crit',stat:'T',value:0},
  '08A2':{type:'crit',stat:'T',value:0},'08A3':{type:'crit',stat:'I',value:0},
  '08B1':{type:'crit',stat:'V',value:0},'08B2':{type:'crit',stat:'Fe',value:0},'08B3':{type:'crit',stat:'V',value:0},
  '08C3':{type:'crit',stat:'En',value:0},'08C4':{type:'crit',stat:'Fr',value:0},
  '08E3':{type:'crit',stat:'I',value:0},
  '08F1':{type:'crit',stat:'Ru',value:0},
  '09A1':{type:'crit',stat:'T',value:0},'09A2':{type:'crit',stat:'V',value:0},'09A3':{type:'crit',stat:'T',value:0},
  '09B1':{type:'crit',stat:'Fe',value:0},'09B2':{type:'crit',stat:'Fe',value:0},'09B3':{type:'crit',stat:'En',value:0},
  '09C3':{type:'std',stat:'Fr',value:0},
  '09D1':{type:'std',stat:'Fr',value:2},'09D2':{type:'std',stat:'Ru',value:4},'09D3':{type:'std',stat:'En',value:0},
  '09E1':{type:'std',stat:'I',value:5},'09E4':{type:'std',stat:'V',value:5},
};

function buildInitial() {
  const s = {};
  for (const cr of CRS) for (const g of GROUPS) for (let p = 1; p <= 4; p++) {
    const coord = cr + g + p;
    s[coord] = BASE[coord] ? { ...BASE[coord] } : { type:'none', stat:'', value:0 };
  }
  return s;
}

function typeInfo(id) { return TYPES.find(t => t.id === id) || TYPES[0]; }

export default function GeneEditor() {
  const [cells, setCells] = useState(buildInitial);
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [output, setOutput] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await storage.get('pg-gene-editor-v1');
        if (r?.value) setCells(prev => ({ ...prev, ...JSON.parse(r.value) }));
      } catch(e) {}
    })();
  }, []);

  function save(next) {
    try { storage.set('pg-gene-editor-v1', JSON.stringify(next)); setSavedAt(Date.now()); } catch(e) {}
  }

  function updateCell(coord, field, val) {
    setCells(prev => {
      const next = { ...prev, [coord]: { ...prev[coord], [field]: val } };
      save(next);
      return next;
    });
  }

  function resetToBase() {
    if (!window.confirm('Reset all cells to the pre-loaded database state?')) return;
    const fresh = buildInitial();
    setCells(fresh);
    save(fresh);
  }

  function generateOutput() {
    const entries = [];
    for (const cr of CRS) {
      for (const g of GROUPS) {
        for (let p = 1; p <= 4; p++) {
          const coord = cr + g + p;
          const c = cells[coord];
          if (!c || c.type === 'none') continue;
          const s = c.stat || '?';
          const t = c.type;
          const v = c.value || 0;
          entries.push(`  '${coord}':{s:'${s}',t:'${t}',v:${v}}`);
        }
      }
    }
    const txt = 'const SG = {\n' + entries.join(',\n') + '\n};';
    setOutput(txt);
    setShowOutput(true);
  }

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const selCell = sel ? cells[sel] : null;
  const hovCell = hov ? cells[hov] : null;
  const infoCoord = sel || hov;
  const infoCell = infoCoord ? cells[infoCoord] : null;
  const ti = infoCell ? typeInfo(infoCell.type) : null;

  // Counts
  const counts = { none:0, std:0, crit:0, floor:0, orange:0, total:0 };
  for (const c of Object.values(cells)) { counts[c.type] = (counts[c.type]||0)+1; if (c.type!=='none') counts.total++; }

  const C = {
    bg:'#0D0F18', sf:'#13172A', card:'#1A1E2F', b:'#252B42',
    tx:'#DCE4F8', mu:'#6B739E', dim:'#2E344F',
  };

  return (
    <div style={{ background:C.bg, color:C.tx, fontFamily:'var(--font-sans)', padding:'16px', borderRadius:'12px', minHeight:'100%' }}>

      {/* ── HEADER ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div>
          <div style={{ fontSize:'15px', fontWeight:500 }}>PG Gene Map Editor</div>
          <div style={{ fontSize:'11px', color:C.mu, marginTop:'2px' }}>
            {counts.total} mapped · {counts.std} std · {counts.crit} crit · {counts.floor} floor · {counts.orange} mut
            {savedAt && <span style={{ color:'#34D399', marginLeft:'8px' }}>✓ saved</span>}
          </div>
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <button onClick={resetToBase} style={{ padding:'6px 12px', fontSize:'12px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>Reset to DB</button>
          <button onClick={generateOutput} style={{ padding:'6px 14px', fontSize:'12px', cursor:'pointer', background:'#1A1200', color:'#F59E0B', border:'0.5px solid #5A3A00', borderRadius:'6px', fontWeight:500 }}>Generate Output →</button>
        </div>
      </div>

      {/* ── INFO BAR ── */}
      <div style={{ minHeight:'30px', marginBottom:'10px', padding:'5px 10px', borderRadius:'6px', background:C.sf, border:'0.5px solid '+C.b, fontSize:'12px', display:'flex', alignItems:'center', gap:'10px' }}>
        {infoCell && infoCoord
          ? <>
              <span style={{ fontFamily:'var(--font-mono)', color:'#F59E0B', fontWeight:500 }}>
                CR{infoCoord.slice(0,2)} {infoCoord[2]}{infoCoord[3]}
              </span>
              <span style={{ color: ti?.text || C.mu, fontWeight:500 }}>{ti?.label || 'None'}</span>
              {infoCell.type !== 'none' && infoCell.stat && <span style={{ color:C.tx }}>{infoCell.stat}</span>}
              {infoCell.type !== 'none' && infoCell.value > 0 && <span style={{ color:C.mu }}>+{infoCell.value}</span>}
              {sel && <span style={{ color:'#60A5FA', fontSize:'11px' }}>← editing</span>}
            </>
          : <span style={{ color:C.mu }}>Hover to inspect · Click to edit</span>
        }
      </div>

      {/* ── GRID ── */}
      <div style={{ overflowX:'auto', marginBottom:'14px' }}>
        <div style={{ minWidth:'fit-content' }}>
          {/* Group headers */}
          <div style={{ display:'flex', marginBottom:'4px', paddingLeft:'38px', gap:'3px' }}>
            {GROUPS.map(g => (
              <div key={g} style={{ width:'70px', textAlign:'center', fontSize:'10px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0 }}>{g}</div>
            ))}
          </div>
          {/* CR rows */}
          {CRS.map(cr => (
            <div key={cr} style={{ display:'flex', alignItems:'center', gap:'3px', marginBottom:'3px' }}>
              <div style={{ width:'34px', fontSize:'10px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0, textAlign:'right', paddingRight:'4px' }}>CR{cr}</div>
              {GROUPS.map(g => (
                <div key={g} style={{ display:'flex', gap:'2px', width:'70px', flexShrink:0 }}>
                  {[1,2,3,4].map(p => {
                    const coord = cr + g + p;
                    const c = cells[coord];
                    const ti = typeInfo(c.type);
                    const isSelected = sel === coord;
                    const isHov = hov === coord;
                    const showLabel = c.type !== 'none' && c.stat;
                    return (
                      <div key={p}
                        onClick={() => setSel(isSelected ? null : coord)}
                        onMouseEnter={() => setHov(coord)}
                        onMouseLeave={() => setHov(null)}
                        style={{
                          width:'15px', height:'15px', borderRadius:'2px', flexShrink:0,
                          background: ti.bright ? ti.bg : '#0D0F18',
                          border: isSelected
                            ? '1.5px solid #fff'
                            : `0.5px solid ${ti.border}`,
                          boxShadow: isSelected
                            ? '0 0 0 1px #60A5FA'
                            : isHov ? '0 0 0 1px #ffffff44' : 'none',
                          cursor:'pointer',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          position:'relative',
                          transition:'box-shadow 0.05s',
                        }}
                      >
                        {ti.bright && (
                          <div style={{
                            width:'7px', height:'7px', borderRadius:'1px',
                            background: ti.bright,
                            opacity: c.type === 'orange' ? 0.7 : 1,
                          }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── LEGEND ── */}
      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'14px', fontSize:'11px', color:C.mu }}>
        {TYPES.filter(t => t.id !== 'none').map(t => (
          <div key={t.id} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:'12px', height:'12px', borderRadius:'2px', background: t.bg, border:'0.5px solid '+t.border, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'1px', background:t.bright }} />
            </div>
            <span style={{ color:t.text }}>{t.label}</span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
          <div style={{ width:'12px', height:'12px', borderRadius:'2px', background:'#0D0F18', border:'1.5px solid #fff' }} />
          Selected
        </div>
      </div>

      {/* ── EDIT PANEL ── */}
      {sel && selCell && (() => {
        const cr = sel.slice(0,2), g = sel[2], p = sel[3];
        const ti = typeInfo(selCell.type);
        return (
          <div style={{ background:C.card, border:'1px solid #60A5FA55', borderRadius:'10px', padding:'14px', marginBottom:'14px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div style={{ fontWeight:500, fontSize:'13px' }}>
                Editing <span style={{ fontFamily:'var(--font-mono)', color:'#F59E0B' }}>CR{cr} {g}{p}</span>
              </div>
              <button onClick={() => setSel(null)} style={{ border:'none', background:'none', cursor:'pointer', color:C.mu, fontSize:'18px', padding:'0', lineHeight:1 }}>×</button>
            </div>

            {/* Type selector */}
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'11px', color:C.mu, marginBottom:'6px' }}>Type</div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => updateCell(sel, 'type', t.id)}
                    style={{ padding:'5px 10px', fontSize:'12px', cursor:'pointer', borderRadius:'5px', fontWeight:500,
                      background: selCell.type === t.id ? (t.bg || C.sf) : 'transparent',
                      border: selCell.type === t.id ? `1.5px solid ${t.border || C.b}` : `0.5px solid ${C.b}`,
                      color: selCell.type === t.id ? (t.text || C.tx) : C.mu,
                    }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stat + Value row (only when not 'none') */}
            {selCell.type !== 'none' && (
              <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', alignItems:'flex-start' }}>
                {/* Stat */}
                <div>
                  <div style={{ fontSize:'11px', color:C.mu, marginBottom:'6px' }}>Stat</div>
                  <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                    <button onClick={() => updateCell(sel, 'stat', '')}
                      style={{ padding:'4px 9px', fontSize:'12px', cursor:'pointer', borderRadius:'4px',
                        background: selCell.stat === '' ? C.sf : 'transparent',
                        border: selCell.stat === '' ? `1px solid ${C.b}` : `0.5px solid ${C.dim}`,
                        color: selCell.stat === '' ? C.mu : C.dim,
                      }}>?</button>
                    {STATS.map(s => (
                      <button key={s} onClick={() => updateCell(sel, 'stat', s)}
                        style={{ padding:'4px 9px', fontSize:'12px', cursor:'pointer', borderRadius:'4px', fontWeight:500,
                          background: selCell.stat === s ? ti.bg : 'transparent',
                          border: selCell.stat === s ? `1.5px solid ${ti.border}` : `0.5px solid ${C.dim}`,
                          color: selCell.stat === s ? (ti.text || C.tx) : C.mu,
                        }}>{s}</button>
                    ))}
                  </div>
                </div>

                {/* Value */}
                <div>
                  <div style={{ fontSize:'11px', color:C.mu, marginBottom:'6px' }}>Stat value</div>
                  <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
                    {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
                      <button key={v} onClick={() => updateCell(sel, 'value', v)}
                        style={{ width:'26px', height:'26px', fontSize:'12px', cursor:'pointer', borderRadius:'4px', fontWeight: selCell.value===v ? 500 : 400,
                          background: selCell.value === v ? ti.bg : 'transparent',
                          border: selCell.value === v ? `1.5px solid ${ti.border}` : `0.5px solid ${C.dim}`,
                          color: selCell.value === v ? (ti.text || C.tx) : C.mu,
                        }}>{v}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── OUTPUT PANEL ── */}
      {showOutput && (
        <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'14px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
            <div style={{ fontSize:'13px', fontWeight:500, color:'#F59E0B' }}>Generated SG output — paste this to me</div>
            <div style={{ display:'flex', gap:'6px' }}>
              <button onClick={copyOutput} style={{ padding:'5px 12px', fontSize:'12px', cursor:'pointer', background: copied ? '#082010' : C.sf, color: copied ? '#34D399' : C.mu, border:'0.5px solid '+(copied ? '#34D399' : C.b), borderRadius:'5px' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button onClick={() => setShowOutput(false)} style={{ border:'none', background:'none', cursor:'pointer', color:C.mu, fontSize:'18px', padding:'0 4px', lineHeight:1 }}>×</button>
            </div>
          </div>
          <textarea readOnly value={output}
            style={{ width:'100%', minHeight:'200px', fontFamily:'var(--font-mono)', fontSize:'11px', padding:'10px', boxSizing:'border-box', resize:'vertical', borderRadius:'6px', border:'0.5px solid '+C.b, background:C.sf, color:C.tx, outline:'none', lineHeight:1.6 }}
          />
        </div>
      )}
    </div>
  );
}

