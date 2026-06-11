import { useState, useEffect } from 'react';
import { parseGenome } from '../lib/parser.js';
import { loadData } from '../lib/storage.js';
import { C } from '../lib/theme.js';

const STABLE_KEY = 'pg-v3'; // Calculator's stable

// ── IMPORT PANEL ──────────────────────────────────────────────────────────────
// Add a specimen either by pasting a genome export, or by picking one from the
// Calculator's stable. Both paths yield { name, genome, gender, gen, id }.
export default function ImportPanel({ onAdd, label, buttonLabel, defaultGen }) {
  const [mode, setMode] = useState('paste'); // 'paste' | 'stable'
  const [text, setText] = useState('');
  const [gender, setGender] = useState('unknown');
  const [gen, setGen] = useState(defaultGen || 1);
  const [err, setErr] = useState('');
  const [stable, setStable] = useState([]);
  const [chosenId, setChosenId] = useState('');

  useEffect(() => { setGen(defaultGen || 1); }, [defaultGen]);

  // (Re)load the Calculator stable whenever the user switches into stable mode.
  useEffect(() => {
    if (mode === 'stable') {
      const list = loadData(STABLE_KEY, []);
      setStable(Array.isArray(list) ? list : []);
      setChosenId(''); setErr('');
    }
  }, [mode]);

  const chosen = stable.find(s => s.id === chosenId) || null;

  // Prefill gender from the picked stable specimen.
  useEffect(() => { if (chosen) setGender(chosen.gender || 'unknown'); /* eslint-disable-next-line */ }, [chosenId]);

  function freshId() { return Date.now() + '-' + Math.random().toString(36).slice(2,6); }

  function submit() {
    if (gender === 'unknown') { setErr('Select a gender.'); return; }
    if (mode === 'paste') {
      if (!text.trim()) { setErr('Paste a genome export.'); return; }
      try {
        const parsed = parseGenome(text);
        if (!Object.keys(parsed.genome).length) { setErr('Could not parse — check format.'); return; }
        onAdd({ ...parsed, gender, gen, id: freshId() });
        setText(''); setGender('unknown'); setErr('');
      } catch(e) { setErr('Parse error: ' + e.message); }
    } else {
      if (!chosen) { setErr('Pick a specimen.'); return; }
      onAdd({ name: chosen.name, genome: chosen.genome, gender, gen, id: freshId() });
      setChosenId(''); setGender('unknown'); setErr('');
    }
  }

  const tabBtn = (id, lbl) => (
    <button onClick={() => { setMode(id); setErr(''); }} style={{
      padding:'5px 12px', fontSize:'12px', cursor:'pointer', borderRadius:'6px', fontWeight: mode===id?500:400,
      background: mode===id ? C.sf : 'transparent', color: mode===id ? C.tx : C.mu,
      border:'0.5px solid '+(mode===id ? C.b : 'transparent'),
    }}>{lbl}</button>
  );

  return (
    <div style={{background:C.card,border:'0.5px solid '+C.b,borderRadius:'10px',padding:'14px'}}>
      {label && <div style={{fontSize:'13px',fontWeight:500,marginBottom:'10px',color:C.mu}}>{label}</div>}

      <div style={{display:'flex',gap:'6px',marginBottom:'10px'}}>
        {tabBtn('paste','Paste export')}
        {tabBtn('stable','From stable')}
      </div>

      {mode === 'paste' ? (
        <textarea value={text} onChange={e=>setText(e.target.value)}
          placeholder={'[Overview]\nEntity=Name\n\n[Genes]\n01= RDRD ...'}
          style={{width:'100%',height:'100px',fontFamily:'var(--font-mono)',fontSize:'11px',padding:'8px',boxSizing:'border-box',resize:'vertical',borderRadius:'7px',border:'0.5px solid '+C.b,background:C.sf,color:C.tx,outline:'none',lineHeight:1.5}}
        />
      ) : stable.length === 0 ? (
        <div style={{fontSize:'12px',color:C.mu,padding:'14px',background:C.sf,borderRadius:'7px',border:'0.5px solid '+C.b,lineHeight:1.6}}>
          No specimens in the Calculator stable yet. Add some in the Calculator (Analyze tab), then pick them here.
        </div>
      ) : (
        <select value={chosenId} onChange={e=>setChosenId(e.target.value)}
          style={{width:'100%',padding:'8px 10px',borderRadius:'7px',border:'0.5px solid '+(chosenId?C.b:C.danger),background:C.sf,color:chosenId?C.tx:C.mu,fontSize:'12px',cursor:'pointer',outline:'none'}}>
          <option value="">— Pick a specimen from the stable —</option>
          {stable.map(s => (
            <option key={s.id} value={s.id}>
              {(s.gender==='male'?'♂ ':s.gender==='female'?'♀ ':'? ') + (s.name || 'Unnamed')}
            </option>
          ))}
        </select>
      )}

      {err && <div style={{fontSize:'11px',color:C.danger,margin:'6px 0 0'}}>{err}</div>}

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
