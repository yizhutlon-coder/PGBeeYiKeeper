import { useState, useRef } from 'react';
import { parseAll } from '../lib/parser.js';
import { C } from '../lib/theme.js';

// Bulk specimen import: drag in (or pick) one or more .txt exports — each file
// may contain several [Overview] blocks — then set a gender per specimen and add
// them all to the stable at once.
function readFile(file) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve(e.target?.result || '');
    r.onerror = () => resolve('');
    r.readAsText(file);
  });
}

export default function BulkImport({ onAddMany }) {
  const [pending, setPending] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function handleFiles(fileList) {
    const files = [...fileList].filter(Boolean);
    if (!files.length) return;
    const texts = await Promise.all(files.map(readFile));
    const parsed = [];
    for (const t of texts) { try { parsed.push(...parseAll(t)); } catch {} }
    if (!parsed.length) { setErr('No valid exports found in those files — each must contain [Overview] and [Genes].'); return; }
    const withIds = parsed.map((s, i) => ({ ...s, id: Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2,5) }));
    setErr('');
    setPending(prev => [...prev, ...withIds]);
  }

  function onDrop(e) {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
  }

  function setGender(id, gender) { setPending(prev => prev.map(s => s.id === id ? { ...s, gender } : s)); }
  function removePending(id) { setPending(prev => prev.filter(s => s.id !== id)); }

  const allSet = pending.length > 0 && pending.every(s => s.gender !== 'unknown');

  function addAll() {
    if (!allSet) return;
    onAddMany(pending);
    setPending([]); setErr('');
  }

  return (
    <div style={{ marginBottom:'16px' }}>
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{ border:'1px dashed '+(dragOver?C.crit:C.b), background:dragOver?C.critBg:C.sf, borderRadius:'10px', padding:'16px', textAlign:'center', cursor:'pointer', color:dragOver?C.crit:C.mu, fontSize:'13px', transition:'all 0.1s' }}
      >
        <div style={{ fontSize:'18px', marginBottom:'4px' }}>⭳</div>
        Drag specimen <span style={{ fontFamily:'var(--font-mono)' }}>.txt</span> exports here, or click to choose files — import many at once
      </div>
      <input ref={fileRef} type="file" accept=".txt,text/plain" multiple onChange={e => { handleFiles(e.target.files); e.target.value=''; }} style={{ display:'none' }} />
      {err && <div style={{ fontSize:'12px', color:C.danger, marginTop:'6px' }}>{err}</div>}

      {pending.length > 0 && (
        <div style={{ marginTop:'12px', background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'12px 14px' }}>
          <div style={{ fontSize:'13px', fontWeight:500, marginBottom:'10px' }}>
            {pending.length} specimen{pending.length>1?'s':''} ready — set gender for each
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'12px' }}>
            {pending.map(s => {
              const gColor = s.gender==='male'?C.male:s.gender==='female'?C.female:C.danger;
              return (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:'10px', background:C.sf, border:'0.5px solid '+(s.gender==='unknown'?C.danger:C.b), borderRadius:'8px', padding:'8px 10px', flexWrap:'wrap' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:500, color:gColor, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {s.gender==='male'?'♂ ':s.gender==='female'?'♀ ':'⚠ '}{s.name||'Unnamed'}
                    </div>
                    <div style={{ fontSize:'11px', color:C.dim, fontFamily:'var(--font-mono)' }}>{Object.keys(s.genome).length} positions</div>
                  </div>
                  <select value={s.gender} onChange={e=>setGender(s.id, e.target.value)} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(s.gender==='unknown'?C.danger:C.b), background:C.bg, color:gColor, fontSize:'12px', cursor:'pointer', fontWeight:500, outline:'none', flexShrink:0 }}>
                    <option value="unknown" style={{ color:C.danger }}>— gender —</option>
                    <option value="male" style={{ color:C.male }}>♂ Male</option>
                    <option value="female" style={{ color:C.female }}>♀ Female</option>
                  </select>
                  <button onClick={()=>removePending(s.id)} title="Remove" style={{ border:'none', background:'none', cursor:'pointer', color:C.dim, fontSize:'16px', lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                </div>
              );
            })}
          </div>
          {!allSet && <div style={{ fontSize:'12px', color:C.caution, marginBottom:'8px' }}>Set a gender for every specimen to add them.</div>}
          <div style={{ display:'flex', gap:'8px' }}>
            <button onClick={addAll} disabled={!allSet} style={{ padding:'7px 16px', fontSize:'13px', cursor: allSet?'pointer':'not-allowed', opacity: allSet?1:0.45 }}>Add {pending.length} to stable</button>
            <button onClick={()=>{ setPending([]); setErr(''); }} style={{ padding:'7px 14px', fontSize:'13px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>Clear</button>
          </div>
        </div>
      )}
    </div>
  );
}
