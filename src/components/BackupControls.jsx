import { useState, useRef } from 'react';
import { C } from '../lib/theme.js';

// Backup / restore all PG data (every localStorage key prefixed `pg-`).
// Lets the user move data between the dev / standalone-HTML / exe versions
// (each is a separate origin) and guard against the browser clearing storage.

function collectData() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('pg-')) data[k] = localStorage.getItem(k);
  }
  return data;
}

function counts(data) {
  let specimens = 0, projects = 0;
  try { specimens = JSON.parse(data['pg-v3'] || '[]').length; } catch {}
  try { projects = (JSON.parse(data['pg-planner-v2'] || '{}').projects || []).length; } catch {}
  return { specimens, projects };
}

export default function BackupControls() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null); // { data, counts } awaiting confirm
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  function exportBackup() {
    const data = collectData();
    if (!Object.keys(data).length) { setErr('Nothing to back up yet.'); return; }
    const payload = { _app: 'pg-genetics', _version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pg-genetics-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    const c = counts(data);
    setErr(''); setMsg(`Exported ${c.specimens} specimens · ${c.projects} projects`);
  }

  function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const data = parsed && parsed.data ? parsed.data : parsed;
        const keys = Object.keys(data || {}).filter(k => k.startsWith('pg-'));
        if (!keys.length) { setErr('That file has no PGBeeYiKeeper data.'); setMsg(''); return; }
        const clean = {};
        for (const k of keys) clean[k] = typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]);
        setErr(''); setMsg(''); setPending({ data: clean, counts: counts(clean) });
      } catch { setErr('Could not read that file — is it a PGBeeYiKeeper backup?'); setMsg(''); }
    };
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!pending) return;
    for (const [k, v] of Object.entries(pending.data)) localStorage.setItem(k, v);
    location.reload();
  }

  const btn = (label, onClick, accent) => (
    <button onClick={onClick} style={{
      padding:'7px 10px', fontSize:'13px', cursor:'pointer', borderRadius:'6px', textAlign:'left',
      background:'transparent', color: accent || C.tx, border:'0.5px solid '+C.b, width:'100%',
    }}>{label}</button>
  );

  return (
    <div style={{ position:'relative' }}>
      <button onClick={() => { setOpen(o => !o); setErr(''); setMsg(''); setPending(null); }}
        title="Backup or restore all your data"
        style={{ padding:'7px 12px', fontSize:'13px', cursor:'pointer', borderRadius:'7px', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, whiteSpace:'nowrap' }}>
        Data ▾
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:50, width:'260px', background:C.card, border:'0.5px solid '+C.b, borderRadius:'10px', padding:'12px', boxShadow:'0 12px 40px #000a', display:'flex', flexDirection:'column', gap:'8px' }}>
          <div style={{ fontSize:'12px', color:C.mu, lineHeight:1.5 }}>
            Back up your stable, tags and projects to a file, or restore from one.
          </div>
          {btn('⭳ Export backup (.json)', exportBackup)}
          {btn('⭱ Import backup…', () => fileRef.current?.click())}
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display:'none' }} />

          {msg && <div style={{ fontSize:'12px', color:C.std, background:C.stdBg, border:'0.5px solid '+C.std+'55', borderRadius:'6px', padding:'6px 8px' }}>{msg}</div>}
          {err && <div style={{ fontSize:'12px', color:C.danger, background:C.dangerBg, border:'0.5px solid '+C.danger+'55', borderRadius:'6px', padding:'6px 8px' }}>{err}</div>}

          {pending && (
            <div style={{ background:C.sf, border:'0.5px solid '+C.caution+'66', borderRadius:'8px', padding:'10px' }}>
              <div style={{ fontSize:'12px', color:C.tx, marginBottom:'4px', fontWeight:500 }}>
                Restore {pending.counts.specimens} specimens · {pending.counts.projects} projects?
              </div>
              <div style={{ fontSize:'11px', color:C.caution, marginBottom:'8px', lineHeight:1.5 }}>
                This replaces your current data and reloads.
              </div>
              <div style={{ display:'flex', gap:'6px' }}>
                <button onClick={confirmRestore} style={{ flex:1, padding:'6px 10px', fontSize:'12px', cursor:'pointer', borderRadius:'6px', background:C.dangerBg, color:C.danger, border:'0.5px solid '+C.danger, fontWeight:500 }}>Restore</button>
                <button onClick={() => setPending(null)} style={{ flex:1, padding:'6px 10px', fontSize:'12px', cursor:'pointer', borderRadius:'6px', background:'transparent', color:C.mu, border:'0.5px solid '+C.b }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
