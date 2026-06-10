import { useState, useEffect } from 'react';
import { parseGenome } from '../lib/parser.js';
import { C } from '../lib/theme.js';

// ── IMPORT PANEL ──────────────────────────────────────────────────────────────
// Single-genome import with gender + generation (F1–F8) dropdowns.
export default function ImportPanel({ onAdd, label, buttonLabel, defaultGen }) {
  const [text, setText] = useState('');
  const [gender, setGender] = useState('unknown');
  const [gen, setGen] = useState(defaultGen || 1);
  const [err, setErr] = useState('');

  useEffect(() => { setGen(defaultGen || 1); }, [defaultGen]);

  function submit() {
    if (!text.trim()) return;
    if (gender==='unknown') { setErr('Select a gender.'); return; }
    try {
      const parsed = parseGenome(text);
      if (!Object.keys(parsed.genome).length) { setErr('Could not parse — check format.'); return; }
      onAdd({...parsed, gender, gen, id: Date.now()+'-'+Math.random().toString(36).slice(2,6)});
      setText(''); setGender('unknown'); setErr('');
    } catch(e) { setErr('Parse error: '+e.message); }
  }

  return (
    <div style={{background:C.card,border:'0.5px solid '+C.b,borderRadius:'10px',padding:'14px'}}>
      {label && <div style={{fontSize:'13px',fontWeight:500,marginBottom:'10px',color:C.mu}}>{label}</div>}
      <textarea value={text} onChange={e=>setText(e.target.value)}
        placeholder={'[Overview]\nEntity=Name\n\n[Genes]\n01= RDRD ...'}
        style={{width:'100%',height:'100px',fontFamily:'var(--font-mono)',fontSize:'11px',padding:'8px',boxSizing:'border-box',resize:'vertical',borderRadius:'7px',border:'0.5px solid '+C.b,background:C.sf,color:C.tx,outline:'none',lineHeight:1.5}}
      />
      {err && <div style={{fontSize:'11px',color:C.danger,margin:'4px 0'}}>{err}</div>}
      <div style={{display:'flex',gap:'8px',marginTop:'8px',alignItems:'center',flexWrap:'wrap'}}>
        <select value={gender} onChange={e=>setGender(e.target.value)}
          style={{padding:'5px 10px',borderRadius:'6px',border:'0.5px solid '+(gender==='unknown'?C.danger:C.b),background:C.sf,color:gender==='male'?C.male:gender==='female'?C.female:C.danger,fontSize:'12px',cursor:'pointer',outline:'none',fontWeight:500}}>
          <option value="unknown" style={{color:C.danger}}>Select gender</option>
          <option value="male" style={{color:C.male}}>Male</option>
          <option value="female" style={{color:C.female}}>Female</option>
        </select>
        <select value={gen} onChange={e=>setGen(Number(e.target.value))}
          style={{padding:'5px 10px',borderRadius:'6px',border:'0.5px solid '+C.b,background:C.sf,color:C.mu,fontSize:'12px',cursor:'pointer',outline:'none'}}>
          {[1,2,3,4,5,6,7,8].map(g=><option key={g} value={g}>F{g}</option>)}
        </select>
        <button onClick={submit} style={{padding:'6px 16px',fontSize:'12px',cursor:'pointer'}}>{buttonLabel}</button>
      </div>
    </div>
  );
}
