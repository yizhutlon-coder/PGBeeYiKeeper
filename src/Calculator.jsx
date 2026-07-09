import { useState, useEffect } from 'react';
import { SG, W, SYM, CRS, GROUPS } from './data/geneData.js';
import { expR, calcStats, scorePair, getTopPairs, getDelList, getCoverage } from './lib/genetics.js';
import { parseAll } from './lib/parser.js';
import { storage } from './lib/storage.js';
import { C, statCol, valCol } from './lib/theme.js';
import BulkImport from './components/BulkImport.jsx';

const TAG_COLORS = ['green','yellow','red','purple'];
const TAG_HEX = { green:'#34D399', yellow:'#FCD34D', red:'#F87171', purple:'#C084FC' };
function Pill({ label, color, bg }) {
  return <span style={{ fontSize:'10px', fontWeight:500, padding:'2px 6px', borderRadius:'3px', background:bg, color, display:'inline-block' }}>{label}</span>;
}

function SpecimenGeneMap({ s, cov }) {
  const [hov, setHov] = useState(null);
  const chrMaxGroup = {};
  for (const cr of CRS) chrMaxGroup[cr] = 0;
  for (const c of Object.keys(SG)) {
    const cr = c.slice(0,2); const gi = c.charCodeAt(2)-65;
    if (chrMaxGroup[cr] !== undefined) chrMaxGroup[cr] = Math.max(chrMaxGroup[cr], gi);
  }

  function cellColor(coord) {
    const info = SG[coord];
    if (!info) return { bg:'#0D0F18', border:'#1A1E2F', isGene:false };
    const v = s.genome[coord] || 'D';
    const isCrit = info.t === 'crit' || info.t === 'gem';
    const stabBest = cov[coord]?.best ?? 'D';
    const isNew = stabBest === 'D' && (v === 'R' || v === 'x'); // this specimen has it but stable doesn't elsewhere

    if (info.t === 'floor') return { bg:'#0C2A1E', border:'#1A4A30', isGene:true, dim:true };
    if (info.t === 'orange') return { bg:'#1A1200', border:C.gem, isGene:true, dim:true, mut:true };
    if (v === 'R') return { bg: isCrit ? '#0C2200' : '#082010', border: isCrit ? '#4A7A00' : '#1A5030', bright:'#34D399', isGene:true, isCrit, isNew };
    if (v === 'x') return { bg:'#1A1200', border:'#5A4000', bright:'#FCD34D', isGene:true, isCrit, isNew };
    return { bg: isCrit ? '#2A0808' : '#0D0F18', border: isCrit ? C.danger : '#1A1E2F', bright: isCrit ? '#7A2020' : null, isGene:true, isCrit };
  }

  const hovInfo = hov ? { coord: hov, info: SG[hov], val: s.genome[hov] || 'D', stabBest: cov[hov]?.best ?? 'D' } : null;

  return (
    <div>
      <div style={{ minHeight:'26px', marginBottom:'8px', padding:'4px 8px', borderRadius:'5px', background:'#0D0F18', border:'0.5px solid '+C.b, fontSize:'11px', color: hovInfo ? C.tx : C.dim }}>
        {hovInfo && hovInfo.info
          ? <>
              <span style={{ fontFamily:'var(--font-mono)', color:C.crit, marginRight:'6px' }}>{hovInfo.coord}</span>
              <span style={{ marginRight:'6px' }}>
                <span style={{ color:statCol(hovInfo.info.s), fontWeight:500 }}>{hovInfo.info.s}</span>
                {hovInfo.info.v>0 && <span style={{ color:valCol(hovInfo.info.v), fontWeight:500, marginLeft:'4px' }}>v:{hovInfo.info.v}</span>}
                {hovInfo.info.t==='crit' && <span style={{ color:C.crit }}> ★</span>}
                {hovInfo.info.t==='orange' && <span> 💎</span>}
              </span>
              <span style={{ color: hovInfo.val==='R'?C.std : hovInfo.val==='x'?C.caution : C.dim }}>
                {SYM[hovInfo.val]} {hovInfo.val==='R'?'〇':hovInfo.val==='x'?'⦿ mixed':'⬤ dominant'}
              </span>
              {hovInfo.stabBest==='D' && hovInfo.val!=='D' && <span style={{ color:C.floor, marginLeft:'6px', fontSize:'10px' }}>★ unique to this specimen</span>}
            </>
          : <span>Hover a cell for details</span>
        }
      </div>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:'fit-content' }}>
          <div style={{ display:'flex', gap:'3px', marginBottom:'3px', paddingLeft:'34px' }}>
            {GROUPS.map(g => <div key={g} style={{ width:'62px', textAlign:'center', fontSize:'9px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0 }}>{g}</div>)}
          </div>
          {CRS.map(cr => (
            <div key={cr} style={{ display:'flex', alignItems:'center', gap:'3px', marginBottom:'2px' }}>
              <div style={{ width:'30px', fontSize:'9px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0, textAlign:'right', paddingRight:'4px' }}>CR{cr}</div>
              {GROUPS.map((g, gi) => {
                const isActive = gi <= (chrMaxGroup[cr] ?? 0);
                return (
                  <div key={g} style={{ display:'flex', gap:'2px', width:'62px', flexShrink:0, opacity: isActive ? 1 : 0.1 }}>
                    {[1,2,3,4].map(p => {
                      const coord = cr + g + p;
                      const cs = cellColor(coord);
                      return (
                        <div key={p}
                          onMouseEnter={() => setHov(coord)}
                          onMouseLeave={() => setHov(null)}
                          style={{ width:'12px', height:'12px', borderRadius:'2px', background: cs.bright || cs.bg, border:(cs.mut?'1px':'0.5px')+' solid '+cs.border, flexShrink:0, cursor:'default', opacity: cs.mut ? 1 : (cs.dim ? 0.5 : 1), boxShadow: cs.isNew ? '0 0 0 1.5px '+C.floor+'99' : hov===coord ? '0 0 0 1.5px #fff4' : 'none' }}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'8px', fontSize:'10px', color:C.mu }}>
        {[['#34D399','〇 Recessive'],['#FCD34D','⦿ Mixed'],['#7A2020','⬤ Dominant'],['#0C2A1E','Floor'],['#1A1200','Locked/Orange']].map(([col,label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col, flexShrink:0 }} />{label}
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
          <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:'transparent', border:'1.5px solid '+C.floor, flexShrink:0 }} />Unique to this specimen
        </div>
      </div>
    </div>
  );
}

function AnalyzeGeneMap({ s, cov }) {
  const [hov, setHov] = useState(null);
  const chrMaxGroup = {};
  for (const cr of CRS) chrMaxGroup[cr] = 0;
  for (const c of Object.keys(SG)) {
    const cr = c.slice(0,2); const gi = c.charCodeAt(2)-65;
    if (chrMaxGroup[cr] !== undefined) chrMaxGroup[cr] = Math.max(chrMaxGroup[cr], gi);
  }
  function cellColor(coord) {
    const info = SG[coord]; if (!info) return null;
    if (info.t === 'floor') return { bg:'#0D0F18', border:'#1A1E2F', dot:null };
    if (info.t === 'orange') {
      const ov = s.genome[coord] || 'D';
      return { bg:'#0D0F18', border:C.gem, dot: ov==='R'?C.gem:ov==='x'?'#FCD34D':null, mut:true };
    }
    const v = s.genome[coord] || 'D';
    const stabBest = cov[coord]?.best ?? 'D';
    const isCrit = info.t === 'crit' || info.t === 'gem';
    if (v === 'D' || v === '?') return { bg:'#0D0F18', border: isCrit ? '#2A1010' : '#1A1E2F', dot:null };
    if (v === 'R') {
      if (stabBest === 'D') return { bg:'#082010', border: isCrit ? '#F59E0B' : '#1A5030', dot:'#34D399', glow: isCrit ? '#F59E0B' : '#34D399', label:'NEW' };
      if (stabBest === 'x') return { bg:'#030C22', border:'#3060A0', dot:'#60A5FA', label:'UP' };
      return { bg:'#071A0E', border:'#1A4030', dot:'#1A6040', label:'OK' };
    }
    if (v === 'x') {
      if (stabBest === 'D') return { bg:'#1A1200', border: isCrit ? '#F59E0B88' : '#5A4000', dot:'#FCD34D', glow: isCrit ? '#F59E0B88' : null, label:'NEW x' };
      return { bg:'#100A00', border:'#3A2800', dot:'#7A6020', label:'x' };
    }
    return null;
  }
  const hovCs = hov ? cellColor(hov) : null;
  const hovInfo = hov ? SG[hov] : null;
  const hovState = hov ? (s.genome[hov] || 'D') : null;
  return (
    <div>
      <div style={{ minHeight:'26px', marginBottom:'8px', padding:'4px 8px', borderRadius:'5px', background:'#0D0F18', border:'0.5px solid '+C.b, fontSize:'11px', color: hovCs ? C.tx : C.dim }}>
        {hovCs && hovInfo
          ? <>
              <span style={{ fontFamily:'var(--font-mono)', color:C.crit, marginRight:'6px' }}>{hov}</span>
              <span style={{ marginRight:'6px' }}>
                <span style={{ color:statCol(hovInfo.s), fontWeight:500 }}>{hovInfo.s}</span>
                {hovInfo.v>0 && <span style={{ color:valCol(hovInfo.v), fontWeight:500, marginLeft:'4px' }}>v:{hovInfo.v}</span>}
                {hovInfo.t === 'crit' && <span style={{ color:C.crit }}> ★</span>}
                {hovInfo.t === 'orange' && <span> 💎</span>}
              </span>
              <span style={{ color: hovCs.dot || C.dim }}>{SYM[hovState] || hovState} </span>
              {hovCs.label && <span style={{ color: hovCs.dot || C.dim, fontSize:'10px' }}>{hovCs.label}</span>}
            </>
          : <span>Hover for details</span>
        }
      </div>
      <div style={{ overflowX:'auto' }}>
        <div style={{ minWidth:'fit-content' }}>
          <div style={{ display:'flex', marginBottom:'3px', paddingLeft:'34px', gap:'3px' }}>
            {GROUPS.map(g => <div key={g} style={{ width:'62px', textAlign:'center', fontSize:'9px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0 }}>{g}</div>)}
          </div>
          {CRS.map(cr => (
            <div key={cr} style={{ display:'flex', alignItems:'center', gap:'3px', marginBottom:'2px' }}>
              <div style={{ width:'30px', fontSize:'9px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0, textAlign:'right', paddingRight:'4px' }}>CR{cr}</div>
              {GROUPS.map((g, gi) => {
                const isActive = gi <= (chrMaxGroup[cr] ?? 0);
                return (
                  <div key={g} style={{ display:'flex', gap:'2px', width:'62px', flexShrink:0, opacity: isActive ? 1 : 0.1 }}>
                    {[1,2,3,4].map(p => {
                      const coord = cr + g + p;
                      const cs = cellColor(coord);
                      if (!cs) return <div key={p} style={{ width:'12px', height:'12px', borderRadius:'2px', background:'#0D0F18', border:'0.5px solid #1A1E2F', flexShrink:0 }} />;
                      return (
                        <div key={p} onMouseEnter={() => setHov(coord)} onMouseLeave={() => setHov(null)}
                          style={{ width:'12px', height:'12px', borderRadius:'2px', background:cs.bg, border:(cs.mut?'1px':'0.5px')+' solid '+cs.border, flexShrink:0, cursor:'default', display:'flex', alignItems:'center', justifyContent:'center',
                            boxShadow: cs.glow ? '0 0 0 1.5px '+cs.glow+'66' : hov === coord ? '0 0 0 1.5px #fff4' : 'none' }}>
                          {cs.dot && <div style={{ width:'6px', height:'6px', borderRadius:'1px', background:cs.dot }} />}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginTop:'8px', fontSize:'10px', color:C.mu }}>
        {[['#34D399','New (recessive)'],['#60A5FA','Upgrades pool'],['#1A6040','Confirms existing'],['#FCD34D','New (mixed)'],['#7A6020','Confirms mixed']].map(([col, label]) => (
          <div key={label} style={{ display:'flex', alignItems:'center', gap:'4px' }}>
            <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col, flexShrink:0 }} />{label}
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyzeStatBox({ label, val, color, sub }) {
  return (
    <div style={{ background:'#1A1E2F', border:'0.5px solid #252B42', borderRadius:'8px', padding:'10px 12px', flex:'1 1 120px', minWidth:0 }}>
      <div style={{ fontSize:'20px', fontWeight:500, color: color || '#DCE4F8' }}>{val}</div>
      <div style={{ fontSize:'11px', color:'#6B739E' }}>{label}</div>
      {sub && <div style={{ fontSize:'10px', color:'#2E344F', marginTop:'1px' }}>{sub}</div>}
    </div>
  );
}

function AnalyzeChip({ c, info, col, bg }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontFamily:'var(--font-mono)', fontSize:'11px', background:bg, color:col, padding:'3px 7px', borderRadius:'3px', border:'0.5px solid '+col+'55' }}>
      {c} <span style={{ opacity:0.7 }}>({info.s}{info.v > 0 ? ' v:'+info.v : ''})</span>
    </span>
  );
}

// Critical genes a specimen carries — 〇 (recessive) and ⦿ (mixed). Used by the
// "show critical genes" toggle on the Stable and Pairs tabs.
function CritGeneChips({ s }) {
  const r = [], x = [];
  for (const [c, info] of Object.entries(SG)) {
    if (info.t !== 'crit' && info.t !== 'gem') continue;
    const v = s.genome[c] || 'D';
    if (v === 'R') r.push({ c, info });
    else if (v === 'x') x.push({ c, info });
  }
  if (!r.length && !x.length) return <div style={{ fontSize:'10px', color:C.dim, marginTop:'6px' }}>no critical genes</div>;
  const chip = (c, info, isR) => (
    <span key={c + (isR ? 'r' : 'x')} style={{ fontFamily:'var(--font-mono)', fontSize:'10px', padding:'1px 5px', borderRadius:'3px', background: isR ? C.critBg : 'transparent', color:C.crit, border:'0.5px solid '+C.crit + (isR ? '88' : '44') }}>
      {c} <span style={{ opacity:0.75 }}>{info.s}{info.v > 0 ? ' v:'+info.v : ''}</span> {isR ? '〇' : '⦿'}
    </span>
  );
  return (
    <div style={{ marginTop:'6px', display:'flex', flexWrap:'wrap', gap:'3px' }}>
      {r.map(({ c, info }) => chip(c, info, true))}
      {x.map(({ c, info }) => chip(c, info, false))}
    </div>
  );
}

// Small "folder name" tag shown on a specimen box across tabs. Its text takes
// the specimen's color-tag hue when one is set (set on the Stable tab).
function FolderTag({ name, color }) {
  if (!name) return null;
  const c = color || C.mu;
  return (
    <span title={'Folder: ' + name} style={{ display:'inline-flex', alignItems:'center', gap:'3px', fontSize:'10px', fontWeight: color ? 500 : 400, padding:'1px 6px', borderRadius:'3px', background:C.sf, color:c, border:'0.5px solid '+(color ? color+'66' : C.b), maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', verticalAlign:'middle' }}>
      <span aria-hidden="true">📁</span>{name}
    </span>
  );
}

// One cross-outcome tally chip (e.g. "R+M ×5 · 50% 〇").
function CrossChip({ label, n, sub, col }) {
  if (!n) return null;
  return (
    <span title={sub} style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background:col+'1F', color:col, border:'0.5px solid '+col+'55', whiteSpace:'nowrap' }}>
      <span style={{ fontFamily:'var(--font-mono)', fontWeight:600 }}>{label}</span> ×<span style={{ fontWeight:700, fontSize:'12px' }}>{n}</span> <span style={{ opacity:0.8 }}>{sub}</span>
    </span>
  );
}

// Cross-outcome tallies for a pairing, split by which gender holds each allele.
const PINK_RM = '#F9A8D4', PINK_RD = '#F2589B', PINK_MD = '#F2415F';
function CrossRow({ label, labelCol, items }) {
  if (!items.some(([, n]) => n > 0)) return null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap', marginTop:'3px' }}>
      <span style={{ fontSize:'10px', color:labelCol, fontWeight:600, width:'48px', flexShrink:0 }}>{label}</span>
      {items.map(([l, n, sub, col]) => <CrossChip key={label+l} label={l} n={n} sub={sub} col={col} />)}
    </div>
  );
}
function CrossBreakdown({ cross }) {
  const shared = [
    ['R+R', cross.rr, '100% 〇', C.std],
    ['M+M', cross.mm, '25% 〇',  C.caution],
  ];
  const male = [
    ['R+M', cross.rmM, '50% 〇',          PINK_RM],
    ['R+D', cross.rdM, 'dilutes his 〇',  PINK_RD],
    ['M+D', cross.mdM, '50% lost',        PINK_MD],
  ];
  const female = [
    ['R+M', cross.rmF, 'clarifies · 50% 〇', PINK_RM],
    ['R+D', cross.rdF, 'fold-in (all ⦿)',    PINK_RD],
    ['M+D', cross.mdF, 'fold-in · 50% lost', PINK_MD],
  ];
  const any = [...shared, ...male, ...female].some(([, n]) => n > 0);
  if (!any) return null;
  return (
    <div style={{ marginTop:'6px' }}>
      <div style={{ fontSize:'10px', color:C.dim, marginBottom:'2px' }}>Cross outcomes per stat gene</div>
      <CrossRow label="Both" labelCol={C.mu} items={shared} />
      <CrossRow label="♂ male" labelCol={C.male} items={male} />
      <CrossRow label="♀ female" labelCol={C.female} items={female} />
    </div>
  );
}

export default function Calculator() {
  const [specimens, setSpecimens] = useState([]);
  const [folders, setFolders] = useState([]);
  // LEGACY-COMPAT (retire): read-only per-specimen color tags from the pre-folder
  // version (`pg-tags-v1`). We never write this again — the color picker moved to
  // folders — but we still READ it so early live users don't lose their old colors.
  // Safe to delete this state + its load + the specColor fallback once folder colors
  // are the norm. Nothing writes pg-tags-v1, so it can only shrink in relevance.
  const [legacyTags, setLegacyTags] = useState({});
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(undefined); // folder id hovered (null = Unfiled, undefined = none)
  const [collapsedFolders, setCollapsedFolders] = useState({});
  const [renamingFolder, setRenamingFolder] = useState(null);
  const [folderRenameVal, setFolderRenameVal] = useState('');
  const [tab, setTab] = useState('analyze');
  const [expand, setExpand] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [selectedMale, setSelectedMale] = useState(null);
  const [hoveredGene, setHoveredGene] = useState(null);
  const [selectedGene, setSelectedGene] = useState(null);
  const [showCrit, setShowCrit] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [analyzeInput, setAnalyzeInput] = useState('');
  const [analyzeResult, setAnalyzeResult] = useState(null);
  const [analyzeGender, setAnalyzeGender] = useState('unknown');
  const [analyzeErr, setAnalyzeErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await storage.get('pg-v3'); if (r?.value) setSpecimens(JSON.parse(r.value)); }
      catch(e) {}
      try { const lt = await storage.get('pg-tags-v1'); if (lt?.value) setLegacyTags(JSON.parse(lt.value)); } // LEGACY-COMPAT (retire)
      catch(e) {}
      try { const f = await storage.get('pg-folders-v1'); if (f?.value) setFolders(JSON.parse(f.value)); }
      catch(e) {}
      setLoading(false);
    })();
  }, []);

  async function persist(data) {
    try { await storage.set('pg-v3', JSON.stringify(data)); setSaved(true); setTimeout(() => setSaved(false), 1500); }
    catch(e) {}
  }

  function remove(id) { const u = specimens.filter(s => s.id !== id); setSpecimens(u); persist(u); }
  function confirmDelete() { if (deleteCandidate) { remove(deleteCandidate.id); setDeleteCandidate(null); } }

  function startRename(s) { setRenamingId(s.id); setRenameVal(s.name); }
  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameVal.trim();
    if (trimmed) {
      const updated = specimens.map(s => s.id === renamingId ? { ...s, name: trimmed } : s);
      setSpecimens(updated); persist(updated);
    }
    setRenamingId(null); setRenameVal('');
  }

  // ── FOLDERS ──────────────────────────────────────────────────────────────────
  function persistFolders(list) {
    setFolders(list);
    try { storage.set('pg-folders-v1', JSON.stringify(list)); } catch(e) {}
  }
  function createFolder() {
    const f = { id: 'f-' + Date.now() + '-' + Math.random().toString(36).slice(2,5), name: 'New folder' };
    persistFolders([...folders, f]);
    setRenamingFolder(f.id); setFolderRenameVal(f.name);
  }
  function commitFolderRename() {
    if (!renamingFolder) return;
    const trimmed = folderRenameVal.trim();
    if (trimmed) persistFolders(folders.map(f => f.id === renamingFolder ? { ...f, name: trimmed } : f));
    setRenamingFolder(null); setFolderRenameVal('');
  }
  function deleteFolder(id) {
    const updated = specimens.map(s => (s.folderId ?? null) === id ? { ...s, folderId: null } : s);
    setSpecimens(updated); persist(updated);
    persistFolders(folders.filter(f => f.id !== id));
  }
  const folderName = id => folders.find(f => f.id === id)?.name || null;
  // Color now lives on the folder; a specimen inherits its folder's color.
  function setFolderColor(id, color) {
    persistFolders(folders.map(f => f.id === id ? { ...f, color: f.color === color ? null : color } : f));
  }
  const folderColor = id => { const f = folders.find(x => x.id === id); return f?.color ? TAG_HEX[f.color] : null; };
  // Folder color wins; fall back to the legacy per-specimen tag (LEGACY-COMPAT, retire).
  const specColor = s => folderColor(s.folderId ?? null) || (legacyTags[s.id] ? TAG_HEX[legacyTags[s.id]] : null);

  // ── DRAG REORDER (Stable + Pairs share the specimens array order) ─────────────
  // Move dragged specimen to just before target. On Stable, adopt the target's
  // folder (dropping onto a card in another folder files it there); on Pairs,
  // keepFolder=true so reordering males never changes their folder.
  function moveBeforeSpecimen(draggedId, targetId, keepFolder) {
    if (draggedId === targetId) return;
    const arr = [...specimens];
    const di = arr.findIndex(s => s.id === draggedId);
    if (di < 0) return;
    const dragged = { ...arr[di] };
    arr.splice(di, 1);
    const ti = arr.findIndex(s => s.id === targetId);
    if (!keepFolder && ti >= 0) dragged.folderId = arr[ti].folderId ?? null;
    arr.splice(ti < 0 ? arr.length : ti, 0, dragged);
    setSpecimens(arr); persist(arr);
  }
  // Move dragged specimen to the end of a folder group (fid = null → Unfiled).
  function moveToFolderEnd(draggedId, fid) {
    fid = fid ?? null;
    const arr = [...specimens];
    const di = arr.findIndex(s => s.id === draggedId);
    if (di < 0) return;
    const dragged = { ...arr[di], folderId: fid };
    arr.splice(di, 1);
    let lastIdx = -1;
    arr.forEach((s, i) => { if ((s.folderId ?? null) === fid) lastIdx = i; });
    arr.splice(lastIdx + 1, 0, dragged);
    setSpecimens(arr); persist(arr);
  }

  function analyzeSpecimen() {
    if (!analyzeInput.trim()) return;
    try {
      const parsed = parseAll(analyzeInput);
      if (!parsed.length) { setAnalyzeErr('No valid export found.'); return; }
      setAnalyzeResult(parsed[0]); setAnalyzeErr('');
    } catch(e) { setAnalyzeErr('Parse error: ' + e.message); }
  }

  const males = specimens.filter(s => s.gender === 'male');
  const females = specimens.filter(s => s.gender === 'female');
  const { cov, critTotal, critCov, critProg, stdTotal, stdCov, stdProg, mutTotal, mutCov, mutProg } = getCoverage(specimens);
  const pairs = getTopPairs(specimens, false, cov);
  // A specimen is "paired" if it has at least one valid partner of the opposite gender
  const hasMales = males.length > 0;
  const hasFemales = females.length > 0;
  const pairedIds = new Set(specimens.filter(s =>
    (s.gender === 'male' && hasFemales) || (s.gender === 'female' && hasMales)
  ).map(s => s.id));
  const delList = getDelList(specimens);

  const tLabel = (base, n) => n > 0 ? base + ' (' + n + ')' : base;
  const tStyle = id => ({
    padding:'8px 14px', border:'none', background:'none', cursor:'pointer',
    fontSize:'13px', fontWeight: tab === id ? 500 : 400,
    color: tab === id ? C.tx : C.mu,
    borderBottom:'2px solid ' + (tab === id ? C.crit : 'transparent'),
    marginBottom:'-1px', whiteSpace:'nowrap', transition:'color 0.1s',
  });

  if (loading) return <div style={{ padding:'2rem', color:C.mu, background:C.bg, borderRadius:'12px', fontFamily:'var(--font-sans)' }}>Loading stable…</div>;

  const dc = deleteCandidate;
  const dcRisk = dc ? getDelList([dc, ...specimens.filter(s=>s.id!==dc.id)]).find(d=>d.s.id===dc.id) : null;

  return (
    <div style={{ position:'relative' }}>
      {/* ── DELETE CONFIRMATION MODAL ── */}
      {dc && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, background:'#000000BB', display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteCandidate(null); }}>
          <div style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'14px', padding:'20px', maxWidth:'680px', width:'100%', maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 80px #000' }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
              <div>
                <div style={{ fontSize:'15px', fontWeight:500, marginBottom:'3px' }}>
                  <span style={{ color: dc.gender==='male'?'#60A5FA':dc.gender==='female'?'#F472B6':C.mu, marginRight:'5px', fontWeight:600 }}>
                    {dc.gender==='male'?'♂':dc.gender==='female'?'♀':'?'}
                  </span>
                  {dc.name}
                </div>
                <div style={{ fontSize:'12px', color:C.mu }}>Remove this specimen from the stable?</div>
              </div>
              <button onClick={() => setDeleteCandidate(null)} style={{ border:'none', background:'none', cursor:'pointer', color:C.mu, fontSize:'20px', padding:'0', lineHeight:1 }}>×</button>
            </div>

            {/* Pool loss breakdown */}
            {(() => {
              const others = specimens.filter(s => s.id !== dc.id);
              // For each stat gene this specimen carries (R or x),
              // check what the best state is across remaining specimens
              const lostR  = { crit:[], std:[] }; // nobody else has R — gene fully lost
              const lostRx = { crit:[], std:[] }; // nobody else has R, but someone has x (in progress survives)
              const degraded = { crit:[], std:[] }; // others have x only, this was the only R
              
              for (const [c, info] of Object.entries(SG)) {
                if (info.t === 'floor' || info.t === 'orange') continue;
                const myState = dc.genome[c] || 'D';
                if (myState === 'D') continue; // doesn't have it
                
                const tier = (info.t === 'crit' || info.t === 'gem') ? 'crit' : 'std';
                const othersHaveR = others.some(o => (o.genome[c]||'D') === 'R');
                const othersHaveX = others.some(o => (o.genome[c]||'D') === 'x');
                
                if (myState === 'R') {
                  if (!othersHaveR && !othersHaveX) lostR[tier].push({ c, stat:info.s, v:info.v });
                  else if (!othersHaveR && othersHaveX) degraded[tier].push({ c, stat:info.s, v:info.v });
                } else if (myState === 'x') {
                  if (!othersHaveR && !othersHaveX) lostRx[tier].push({ c, stat:info.s, v:info.v });
                }
              }
              
              const hasAnything = lostR.crit.length || lostR.std.length || lostRx.crit.length || lostRx.std.length || degraded.crit.length || degraded.std.length;
              if (!hasAnything) return (
                <div style={{ background:'#071A0E', border:'0.5px solid #1A5030', borderRadius:'8px', padding:'10px 12px', marginBottom:'14px', fontSize:'12px', color:'#34D399' }}>
                  ✓ No genes will be lost — all positions covered by other specimens
                </div>
              );
              
              const Chip = ({ c, stat, v, col, bg }) => (
                <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontFamily:'var(--font-mono)', fontSize:'11px', background:bg, color:col, padding:'3px 7px', borderRadius:'3px', border:'0.5px solid '+col+'55' }}>
                  {c} <span style={{ opacity:0.7 }}>({stat}{v>0?' v:'+v:''})</span>
                </span>
              );
              
              return (
                <div style={{ marginBottom:'14px', display:'flex', flexDirection:'column', gap:'8px' }}>
                  {/* Fully lost — no one has it */}
                  {(lostR.crit.length > 0) && (
                    <div style={{ background:C.dangerBg, border:'0.5px solid '+C.danger, borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:C.danger, marginBottom:'6px' }}>⛔ Critical genes permanently lost from pool</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {lostR.crit.map(g => <Chip key={g.c} {...g} col={C.danger} bg='#2A0808' />)}
                      </div>
                    </div>
                  )}
                  {(lostR.std.length > 0) && (
                    <div style={{ background:'#180808', border:'0.5px solid #7A2020', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:'#C07070', marginBottom:'6px' }}>✕ Standard genes permanently lost from pool</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {lostR.std.map(g => <Chip key={g.c} {...g} col='#C07070' bg='#200808' />)}
                      </div>
                    </div>
                  )}
                  {/* Only had x — nobody has it at all */}
                  {(lostRx.crit.length > 0 || lostRx.std.length > 0) && (
                    <div style={{ background:'#1A1200', border:'0.5px solid '+C.caution, borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:C.caution, marginBottom:'6px' }}>⚠ Genes lost — only as ⦿ in this specimen (no one has these)</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {[...lostRx.crit, ...lostRx.std].map(g => <Chip key={g.c} {...g} col={C.caution} bg='#1A1200' />)}
                      </div>
                    </div>
                  )}
                  {/* Degraded — this was the only R, others have x */}
                  {(degraded.crit.length > 0 || degraded.std.length > 0) && (
                    <div style={{ background:'#0D0D00', border:'0.5px solid #5A5000', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:'#A09030', marginBottom:'6px' }}>↓ Gene pool degrades 〇→⦿ (others only have mixed)</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {[...degraded.crit, ...degraded.std].map(g => <Chip key={g.c} {...g} col='#A09030' bg='#151000' />)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Gene map */}
            <div style={{ marginBottom:'16px' }}>
              <div style={{ fontSize:'12px', color:C.mu, marginBottom:'8px', fontWeight:500 }}>Genome overview</div>
              <SpecimenGeneMap s={dc} cov={cov} />
            </div>

            {/* Actions */}
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={() => setDeleteCandidate(null)}
                style={{ padding:'8px 20px', borderRadius:'7px', border:'0.5px solid '+C.b, background:'transparent', color:C.mu, fontSize:'13px', cursor:'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDelete}
                style={{ padding:'8px 20px', borderRadius:'7px', background:C.dangerBg, color:C.danger, fontSize:'13px', fontWeight:500, cursor:'pointer', border:'0.5px solid '+C.danger }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <h2 className="sr-only">Project Gorgon Genetics Pairing Calculator</h2>

      <div style={{ background:C.bg, fontFamily:'var(--font-sans)', color:C.tx, padding:'16px', borderRadius:'12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'8px' }}>
        <div>
          <span style={{ fontSize:'15px', fontWeight:500, letterSpacing:'0.01em' }}>Stable</span>
          <span style={{ fontSize:'12px', color:C.mu, marginLeft:'10px' }}>
            {specimens.length} specimens &middot; {males.length}♂ {females.length}♀
          </span>
          {saved && <span style={{ fontSize:'12px', color:C.std, marginLeft:'8px' }}>✓ saved</span>}
        </div>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', cursor:'pointer', padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(expand?C.floor:C.b), background:expand?C.floorBg:'transparent', color:expand?C.floor:C.mu }}>
            <input type="checkbox" checked={expand} onChange={e => setExpand(e.target.checked)} style={{ margin:0 }} />
            Detailed cross mode
          </label>
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', borderBottom:'1px solid '+C.b, marginBottom:'16px', overflowX:'auto' }}>
        {[['analyze','Analyze'],['stable',tLabel('Stable',specimens.length)],['pairings',tLabel('Pairs',pairs.length)],['manage','Manage'],['genes','Gene Map']].map(([id,lb]) => (
          <button key={id} style={tStyle(id)} onClick={() => { setTab(id); setExpanded(null); setSelectedMale(null); }}>{lb}</button>
        ))}
      </div>


      {/* ── STABLE ── */}
      {tab === 'stable' && (() => {
        const groups = folders.length
          ? [
              ...folders.map(f => ({ id: f.id, name: f.name, color: f.color, items: specimens.filter(s => (s.folderId ?? null) === f.id) })),
              // Unfiled also catches any specimen whose folderId no longer matches a
              // known folder (orphan safety), so nothing can vanish from the stable.
              { id: null, name: 'Unfiled', items: specimens.filter(s => !folders.some(f => f.id === (s.folderId ?? null))) },
            ]
          : null;

        const renderCard = (s) => {
          const st = calcStats(s);
          const gColor = s.gender === 'male' ? '#60A5FA' : s.gender === 'female' ? '#F472B6' : C.mu;
          const gSym = s.gender === 'male' ? '♂' : s.gender === 'female' ? '♀' : '?';
          const tagColor = specColor(s);
          const fName = folderName(s.folderId ?? null);
          return (
            <div key={s.id}
              draggable={renamingId !== s.id}
              onDragStart={e => { setDraggingId(s.id); e.dataTransfer.effectAllowed = 'move'; }}
              onDragEnd={() => { setDraggingId(null); setDragOverFolder(undefined); }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); e.stopPropagation(); if (draggingId) moveBeforeSpecimen(draggingId, s.id); setDraggingId(null); setDragOverFolder(undefined); }}
              style={{ background:C.card, border:'0.5px solid '+(tagColor||C.b), borderRadius:'10px', padding:'12px 14px', boxShadow: tagColor ? 'inset 3px 0 0 '+tagColor : 'none', opacity: draggingId===s.id ? 0.4 : 1, cursor: renamingId===s.id ? 'default' : 'grab' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div style={{ minWidth:0, flex:1 }}>
                  {renamingId === s.id
                    ? <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
                        <span style={{ color:gColor, fontWeight:600, flexShrink:0 }}>{gSym}</span>
                        <input
                          autoFocus
                          value={renameVal}
                          onChange={e => setRenameVal(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={e => { if (e.key==='Enter') commitRename(); if (e.key==='Escape') { setRenamingId(null); setRenameVal(''); } }}
                          style={{ flex:1, minWidth:0, fontSize:'13px', fontWeight:500, background:'transparent', border:'none', borderBottom:'1px solid '+C.crit, outline:'none', color:C.tx, padding:'0 2px' }}
                        />
                      </div>
                    : <div style={{ fontWeight:500, fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'text' }} onClick={() => startRename(s)} title="Click to rename">
                        <span style={{ color:gColor, marginRight:'4px', fontWeight:600 }}>{gSym}</span>{s.name}
                        <span style={{ color:C.dim, fontSize:'11px', marginLeft:'5px', opacity:0.6 }}>✎</span>
                      </div>
                  }
                  <div style={{ fontSize:'11px', color:C.mu, marginTop:'2px', textTransform:'capitalize' }}>{s.gender}</div>
                </div>
                <button onClick={() => setDeleteCandidate(s)} style={{ border:'none', background:'none', cursor:'pointer', color:C.dim, fontSize:'16px', padding:'0', lineHeight:1, marginLeft:'6px', flexShrink:0 }}>×</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'5px', marginBottom:'8px' }}>
                {[['Score', st.score, C.tx],['Crit 〇', st.critR, C.crit],['Std 〇', st.stdR, C.std]].map(([lbl,val,col]) => (
                  <div key={lbl} style={{ background:C.sf, borderRadius:'6px', padding:'5px 4px', textAlign:'center' }}>
                    <div style={{ fontSize:'16px', fontWeight:500, color:col }}>{val}</div>
                    <div style={{ fontSize:'10px', color:C.mu }}>{lbl}</div>
                  </div>
                ))}
              </div>
              {(st.mutR > 0 || st.mixed > 0) && (
                <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                  {st.mutR > 0 && <Pill label={'💎 ' + st.mutR + ' paramount 〇 (mutation)'} color={C.gem} bg={C.gemBg} />}
                  {st.mixed > 0 && <Pill label={st.mixed + ' mixed stat genes'} color={C.mixed} bg={C.mixedBg} />}
                </div>
              )}
              {fName && <div style={{ marginTop:'8px' }}><FolderTag name={fName} color={tagColor} /></div>}
              {showCrit && <CritGeneChips s={s} />}
            </div>
          );
        };

        const grid = (items, folderId) => {
          const fid = folderId ?? null;
          const isOver = draggingId && (dragOverFolder ?? undefined) === fid;
          return (
            <div
              onDragOver={e => { e.preventDefault(); setDragOverFolder(fid); }}
              onDrop={e => { e.preventDefault(); if (draggingId) moveToFolderEnd(draggingId, fid); setDraggingId(null); setDragOverFolder(undefined); }}
              style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(230px, 1fr))', gap:'10px', minHeight: groups ? '52px' : undefined, padding: groups ? '6px' : 0, borderRadius:'8px', outline: isOver ? '1px dashed '+C.floor : 'none', outlineOffset:'2px', background: isOver ? C.floorBg+'55' : 'transparent' }}>
              {items.length ? items.map(renderCard) : <div style={{ fontSize:'11px', color:C.dim, padding:'10px', gridColumn:'1/-1' }}>Drag specimens here to file them.</div>}
            </div>
          );
        };

        return (
          <div>
            {specimens.length > 0 && (
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap', marginBottom:'12px' }}>
                <label style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'12px', cursor:'pointer', padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(showCrit?C.crit:C.b), background:showCrit?C.critBg:'transparent', color:showCrit?C.crit:C.mu }}>
                  <input type="checkbox" checked={showCrit} onChange={e => setShowCrit(e.target.checked)} style={{ margin:0 }} />
                  Show critical genes
                </label>
                <button onClick={createFolder} style={{ padding:'5px 12px', fontSize:'12px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>📁 New folder</button>
                <span style={{ fontSize:'11px', color:C.dim }}>Drag cards to reorder or file into folders</span>
              </div>
            )}
            {specimens.length === 0
              ? <p style={{ color:C.mu, fontSize:'14px' }}>No specimens loaded. Use the Analyze tab to add genome exports.</p>
              : groups
                ? <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                    {groups.map(g => {
                      const key = g.id ?? '__unfiled__';
                      const collapsed = !!collapsedFolders[key];
                      const isOver = draggingId && (dragOverFolder ?? undefined) === (g.id ?? null);
                      return (
                        <div key={key}>
                          <div
                            onDragOver={e => { e.preventDefault(); setDragOverFolder(g.id ?? null); }}
                            onDrop={e => { e.preventDefault(); if (draggingId) moveToFolderEnd(draggingId, g.id ?? null); setDraggingId(null); setDragOverFolder(undefined); }}
                            style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 10px', borderRadius:'7px', background: isOver ? C.floorBg : C.sf, border:'0.5px solid '+(isOver ? C.floor : C.b), marginBottom:'6px' }}>
                            <button onClick={() => setCollapsedFolders(c => ({ ...c, [key]: !collapsed }))} style={{ border:'none', background:'none', cursor:'pointer', color:C.mu, fontSize:'12px', padding:0, lineHeight:1 }}>{collapsed ? '▸' : '▾'}</button>
                            {g.id && renamingFolder === g.id
                              ? <input autoFocus value={folderRenameVal} onChange={e => setFolderRenameVal(e.target.value)} onBlur={commitFolderRename}
                                  onKeyDown={e => { if (e.key==='Enter') commitFolderRename(); if (e.key==='Escape') { setRenamingFolder(null); setFolderRenameVal(''); } }}
                                  style={{ fontSize:'13px', fontWeight:500, background:'transparent', border:'none', borderBottom:'1px solid '+C.crit, outline:'none', color:C.tx, padding:'0 2px', width:'160px' }} />
                              : <span onClick={() => { if (g.id) { setRenamingFolder(g.id); setFolderRenameVal(g.name); } }} title={g.id ? 'Click to rename' : ''} style={{ fontWeight:500, fontSize:'13px', cursor: g.id ? 'text' : 'default', color: g.color ? TAG_HEX[g.color] : (g.id ? C.tx : C.mu) }}>
                                  {g.id ? '📁 ' + g.name : g.name}{g.id && <span style={{ color:C.dim, fontSize:'11px', marginLeft:'5px', opacity:0.6 }}>✎</span>}
                                </span>
                            }
                            <span style={{ fontSize:'11px', color:C.mu }}>({g.items.length})</span>
                            <div style={{ flex:1 }} />
                            {g.id && (
                              <div style={{ display:'flex', gap:'3px', marginRight:'2px' }}>
                                {TAG_COLORS.map(c => (
                                  <button key={c} onClick={() => setFolderColor(g.id, c)} title={'Folder color: ' + c}
                                    style={{ width:'14px', height:'14px', borderRadius:'3px', cursor:'pointer', padding:0, border:'1.5px solid '+(g.color===c ? TAG_HEX[c] : TAG_HEX[c]+'55'), background: g.color===c ? TAG_HEX[c] : 'transparent' }} />
                                ))}
                              </div>
                            )}
                            {g.id && <button onClick={() => deleteFolder(g.id)} title="Delete folder (specimens move to Unfiled)" style={{ border:'none', background:'none', cursor:'pointer', color:C.dim, fontSize:'15px', padding:'0 2px', lineHeight:1 }}>×</button>}
                          </div>
                          {!collapsed && grid(g.items, g.id)}
                        </div>
                      );
                    })}
                  </div>
                : grid(specimens, null)
            }
          </div>
        );
      })()}

      {/* ── PAIRINGS ── */}
      {tab === 'pairings' && (() => {
        const females = specimens.filter(s => s.gender === 'female');

        // All pairings for a given male, sorted by score.
        // Score always uses the clarification calculation — Detailed cross mode
        // only reveals the breakdown boxes; it never changes the ranking.
        function malePairings(m) {
          return females.map(f => ({
            m, f, score: scorePair(m, f, false, cov)
          })).sort((a,b) => b.score - a.score);
        }

        // Mode banner
        const banner = (
          <div style={{ marginBottom:'12px', padding:'8px 12px', borderRadius:'7px', background: expand ? C.floorBg : C.sf, border:'0.5px solid '+(expand ? C.floor : C.b), fontSize:'12px', color: expand ? C.floor : C.mu, lineHeight:1.6 }}>
            {expand
              ? <><strong style={{ color:C.floor }}>Detailed cross mode:</strong> Each pairing breaks down — per gender — how its mix would play out gene by gene, i.e. how much <em>messier</em> it would make the line (the R+R / R+M / R+D / M+D boxes). Click any box to expand the full per-gene detail.</>
              : <><strong style={{ color:C.mu }}>Clarification mode:</strong> Females ranked by expected 〇 output — this is for <em>clarifying</em>, i.e. cleaning up the bloodline as fast as possible so the line is easier to plan crosses around. It is not for chasing the highest-stat outcome.</>
            }
          </div>
        );

        const critToggle = (
          <label style={{ display:'inline-flex', alignItems:'center', gap:'6px', fontSize:'12px', cursor:'pointer', padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(showCrit?C.crit:C.b), background:showCrit?C.critBg:'transparent', color:showCrit?C.crit:C.mu, marginBottom:'12px' }}>
            <input type="checkbox" checked={showCrit} onChange={e => setShowCrit(e.target.checked)} style={{ margin:0 }} />
            Show critical genes
          </label>
        );

        if (males.length === 0) return (
          <div>{banner}<p style={{ color:C.mu, fontSize:'14px' }}>No males in stable.</p></div>
        );

        // ── MALE LIST VIEW ──
        if (!selectedMale) return (
          <div>
            {banner}
            {critToggle}
            <div style={{ fontSize:'12px', color:C.mu, marginBottom:'10px' }}>Select a male to see his pairings</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'8px' }}>
              {males.map(m => {
                const st = calcStats(m);
                const tagColor = specColor(m);
                const mPairs = malePairings(m);
                const topScore = mPairs.length > 0 ? mPairs[0].score.toFixed(1) : '—';
                const newCrit = females.length > 0 ? Math.max(...mPairs.map(p =>
                  Object.entries(SG).filter(([c,info]) => (info.t==='crit'||info.t==='gem') && cov[c]?.best==='D' && (p.m.genome[c]||'D') in {R:1,x:1}).length
                )) : 0;
                const mFolder = folderName(m.folderId ?? null);
                return (
                  <div key={m.id}
                    draggable
                    onDragStart={e => { setDraggingId(m.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => setDraggingId(null)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); if (draggingId && draggingId !== m.id) moveBeforeSpecimen(draggingId, m.id, true); setDraggingId(null); }}
                    onClick={() => { setSelectedMale(m.id); setExpanded(null); }}
                    style={{ background:C.card, border:'0.5px solid '+(tagColor||C.b), borderRadius:'10px', padding:'12px 14px', cursor:'pointer', boxShadow: tagColor ? 'inset 3px 0 0 '+tagColor : 'none', transition:'border-color 0.1s', opacity: draggingId===m.id ? 0.4 : 1 }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#4A5070'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = tagColor||C.b}
                  >
                    <div style={{ fontWeight:500, fontSize:'13px', marginBottom:'8px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {tagColor && <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'2px', background:tagColor, marginRight:'5px', verticalAlign:'middle' }} />}
                      <span style={{ color:'#60A5FA' }}>♂ {m.name}</span>
                      {st.mutR > 0 && <span title="paramount 〇 mutations" style={{ marginLeft:'6px', fontSize:'10px', color:C.gem, background:C.gemBg, border:'0.5px solid '+C.gem+'66', borderRadius:'3px', padding:'1px 5px' }}>💎 {st.mutR}</span>}
                    </div>
                    {mFolder && <div style={{ marginBottom:'8px' }}><FolderTag name={mFolder} color={tagColor} /></div>}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', fontSize:'11px' }}>
                      <div style={{ background:C.sf, borderRadius:'5px', padding:'4px 6px', textAlign:'center' }}>
                        <div style={{ fontSize:'15px', fontWeight:500, color:C.tx }}>{st.critR}</div>
                        <div style={{ color:C.mu }}>crit R</div>
                      </div>
                      <div style={{ background:C.sf, borderRadius:'5px', padding:'4px 6px', textAlign:'center' }}>
                        <div style={{ fontSize:'15px', fontWeight:500, color:C.std }}>{st.stdR}</div>
                        <div style={{ color:C.mu }}>std R</div>
                      </div>
                    </div>
                    <div style={{ marginTop:'7px', fontSize:'11px', color:C.mu, display:'flex', justifyContent:'space-between' }}>
                      <span>best score <span style={{ color:C.tx }}>{topScore}</span></span>
                      {females.length === 0 && <span style={{ color:C.danger }}>no females</span>}
                      {newCrit > 0 && <span style={{ color:C.floor }}>+{newCrit} new crit</span>}
                    </div>
                    {showCrit && <CritGeneChips s={m} />}
                  </div>
                );
              })}
            </div>
          </div>
        );

        // ── PAIRINGS FOR SELECTED MALE ──
        const m = specimens.find(s => s.id === selectedMale);
        if (!m) { setSelectedMale(null); return null; }
        const mPairs = malePairings(m);

        return (
          <div>
            {banner}
            {/* Back + male header */}
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px', flexWrap:'wrap' }}>
              <button onClick={() => { setSelectedMale(null); setExpanded(null); }}
                style={{ padding:'5px 12px', fontSize:'12px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>
                ← Males
              </button>
              <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                {specColor(m) && <span style={{ display:'inline-block', width:'9px', height:'9px', borderRadius:'2px', background:specColor(m) }} />}
                <span style={{ color:'#60A5FA', fontWeight:500, fontSize:'14px' }}>♂ {m.name}</span>
              </div>
              <span style={{ fontSize:'12px', color:C.mu }}>{mPairs.length} female{mPairs.length !== 1 ? 's' : ''} available</span>
              {critToggle}
            </div>
            {showCrit && (
              <div style={{ marginBottom:'12px', padding:'8px 10px', background:C.sf, border:'0.5px solid '+C.b, borderRadius:'8px' }}>
                <div style={{ fontSize:'11px', color:C.mu, marginBottom:'4px', fontWeight:500 }}>♂ {m.name} — critical genes</div>
                <CritGeneChips s={m} />
              </div>
            )}

            {mPairs.length === 0
              ? <p style={{ color:C.mu, fontSize:'14px' }}>No females in stable to pair with.</p>
              : <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {mPairs.map((p, i) => {
                    const isExp = expanded === i;
                    const m = p.m, f = p.f;

                    // Fold-in: female has gene, male is missing it entirely
                    const foldInCrit = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'crit' && info.t !== 'gem') return false;
                      const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
                      return (ms === 'D' || ms === '?') && (fs === 'R' || fs === 'x');
                    }).length;
                    const foldInStd = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'std') return false;
                      const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
                      return (ms === 'D' || ms === '?') && (fs === 'R' || fs === 'x');
                    }).length;

                    // Clarification: male has mixed, female has clean recessive — can resolve
                    const clarCrit = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'crit' && info.t !== 'gem') return false;
                      return (m.genome[c]||'D') === 'x' && (f.genome[c]||'D') === 'R';
                    }).length;
                    const clarStd = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'std') return false;
                      return (m.genome[c]||'D') === 'x' && (f.genome[c]||'D') === 'R';
                    }).length;

                    // New to stable pool entirely
                    const newCritGenes = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'crit' && info.t !== 'gem') return false;
                      if (cov[c]?.best !== 'D') return false;
                      const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
                      return ms === 'R' || fs === 'R' || ms === 'x' || fs === 'x';
                    }).length;
                    const newStdGenes = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'std') return false;
                      if (cov[c]?.best !== 'D') return false;
                      const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
                      return ms === 'R' || fs === 'R' || ms === 'x' || fs === 'x';
                    }).length;

                    const canClarify = clarCrit + clarStd > 0;
                    const hasFoldIn = foldInCrit + foldInStd > 0;

                    // Regression: male has clean R, female has nothing → offspring all ⦿ (cleanup cost)
                    const regCrit = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'crit' && info.t !== 'gem') return false;
                      return (m.genome[c]||'D') === 'R' && (f.genome[c]||'D') === 'D';
                    }).length;
                    const regStd = Object.entries(SG).filter(([c,info]) => {
                      if (info.t !== 'std') return false;
                      return (m.genome[c]||'D') === 'R' && (f.genome[c]||'D') === 'D';
                    }).length;

                    // ── Cross-outcome breakdown: classify every stat position by the
                    // two parents' states, split by which gender holds each allele ──
                    const cross = (() => {
                      let rr=0, mm=0, rmM=0, rmF=0, rdM=0, rdF=0, mdM=0, mdF=0;
                      for (const [c, info] of Object.entries(SG)) {
                        if (info.t === 'floor') continue;
                        const ms = m.genome[c]||'D', fs = f.genome[c]||'D';
                        if (ms==='R'&&fs==='R') rr++;
                        else if (ms==='x'&&fs==='x') mm++;
                        else if (ms==='R'&&fs==='x') rmM++;   // male holds the 〇
                        else if (ms==='x'&&fs==='R') rmF++;   // female holds the 〇
                        else if (ms==='R'&&fs==='D') rdM++;   // male's 〇 gets diluted
                        else if (ms==='D'&&fs==='R') rdF++;   // female folds in a gene he lacks
                        else if (ms==='x'&&fs==='D') mdM++;   // male's ⦿ at risk
                        else if (ms==='D'&&fs==='x') mdF++;   // female's ⦿ at risk
                      }
                      return { rr, mm, rmM, rmF, rdM, rdF, mdM, mdF };
                    })();

                    const detail = isExp ? Object.entries(SG)
                      .filter(([c, info]) => {
                        if (info.t === 'floor') return false;
                        // orange genes always included
                        const ms = p.m.genome[c]||'D', fs = p.f.genome[c]||'D';
                        return ms === 'R' || fs === 'R' || ms === 'x' || fs === 'x';
                      })
                      .map(([c, info]) => ({
                        c, info,
                        ms: p.m.genome[c]||'D',
                        fs: p.f.genome[c]||'D',
                        er: expR(p.m.genome[c]||'D', p.f.genome[c]||'D'),
                        stabBest: cov[c]?.best ?? 'D',
                      }))
                      .sort((a,b) => {
                        if (expand) {
                          const aNew = a.stabBest==='D'?1:0, bNew = b.stabBest==='D'?1:0;
                          if (bNew !== aNew) return bNew - aNew;
                        }
                        return (W[b.info.t]||1)-(W[a.info.t]||1) || b.er-a.er;
                      })
                      : [];

                    return (
                      <div key={i} style={{ border:'0.5px solid '+(newCritGenes>0&&expand?C.floor:C.b), borderRadius:'10px', overflow:'hidden', background:C.card }}>
                        <div style={{ padding:'12px 14px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}
                          onClick={() => setExpanded(isExp ? null : i)}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0, flex:1 }}>
                            <span style={{ background:C.sf, borderRadius:'50%', width:'26px', height:'26px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:500, color:C.crit, flexShrink:0 }}>
                              {i+1}
                            </span>
                            <div style={{ minWidth:0, flex:1 }}>
                              <div style={{ fontSize:'13px', fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'5px' }}>
                                {specColor(f) && <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'2px', background:specColor(f), marginRight:'5px', verticalAlign:'middle' }} />}
                                <span style={{ color:'#F472B6' }}>♀ {f.name}</span>
                                <span style={{ fontSize:'11px', color:C.mu, fontWeight:400, marginLeft:'8px' }}>score {p.score.toFixed(1)}</span>
                                {folderName(f.folderId ?? null) && <span style={{ marginLeft:'8px' }}><FolderTag name={folderName(f.folderId ?? null)} color={specColor(f)} /></span>}
                              </div>
                              <div style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
                                <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background: canClarify ? '#030C22' : C.sf, color: canClarify ? '#60A5FA' : C.dim, border:'0.5px solid '+(canClarify ? '#3060A0' : C.dim+'44') }}>
                                  {canClarify
                                    ? 'clarifies ' + (clarCrit > 0 ? clarCrit + ' crit' : '') + (clarCrit > 0 && clarStd > 0 ? ' + ' : '') + (clarStd > 0 ? clarStd + ' std' : '')
                                    : 'no clarification'
                                  }
                                </span>
                                {hasFoldIn && (
                                  <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background: foldInCrit > 0 ? C.critBg : C.stdBg, color: foldInCrit > 0 ? C.crit : C.std, border:'0.5px solid '+(foldInCrit > 0 ? C.crit+'55' : C.std+'55') }}>
                                    {'fold-in: ' + (foldInCrit > 0 ? foldInCrit + ' crit' : '') + (foldInCrit > 0 && foldInStd > 0 ? ' + ' : '') + (foldInStd > 0 ? foldInStd + ' std' : '')}
                                  </span>
                                )}
                                {(regCrit + regStd) > 0 && (
                                  <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background: regCrit > 0 ? C.dangerBg : '#180808', color: regCrit > 0 ? C.danger : '#C07070', border:'0.5px solid '+(regCrit > 0 ? C.danger+'55' : '#7A202055') }}>
                                    {'mixes: ' + (regCrit > 0 ? regCrit + ' crit' : '') + (regCrit > 0 && regStd > 0 ? ' + ' : '') + (regStd > 0 ? regStd + ' std' : '')}
                                  </span>
                                )}
                                {newCritGenes > 0 && (
                                  <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background:C.floorBg, color:C.floor, border:'0.5px solid '+C.floor+'55', fontWeight:500 }}>
                                    {'+' + newCritGenes + ' new to pool'}
                                  </span>
                                )}
                                {newStdGenes > 0 && newCritGenes === 0 && (
                                  <span style={{ fontSize:'11px', padding:'2px 7px', borderRadius:'4px', background:C.stdBg, color:C.std+'aa', border:'0.5px solid '+C.std+'33' }}>
                                    {'+' + newStdGenes + ' new std to pool'}
                                  </span>
                                )}
                              </div>
                              {expand && <CrossBreakdown cross={cross} />}
                              {showCrit && <CritGeneChips s={f} />}
                            </div>
                          </div>
                          <span style={{ color:C.dim, fontSize:'12px', flexShrink:0, marginLeft:'8px' }}>{isExp ? '▲' : '▼'}</span>
                        </div>
                        {isExp && (
                          <div style={{ borderTop:'0.5px solid '+C.b, padding:'12px 14px', background:C.sf }}>
                            <div style={{ fontSize:'11px', color:C.mu, marginBottom:'8px' }}>
                              Positions where at least one parent has R or mixed — sorted by priority
                            </div>
                            {detail.length === 0
                              ? <div style={{ fontSize:'12px', color:C.mu }}>No active stat gene positions in this pairing.</div>
                              : <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                                  {detail.map(({ c, info, ms, fs, er, stabBest }) => {
                                    const erPct = Math.round(er*100);
                                    const [bg, borderCol, pctCol] =
                                      er>=1    ? [C.stdBg,    C.std,    C.std]   :
                                      er>=0.5  ? [C.floorBg,  C.floor,  C.floor] :
                                      er>=0.25 ? [C.cautionBg,C.caution,C.caution] :
                                                 [C.dim+'22', C.b,      C.mu];
                                    const labelCol = info.t==='crit'?C.crit:info.t==='gem'?C.gem:C.mu;
                                    const symCol = v => v==='R'?C.std:v==='x'?C.mixed:C.mu;
                                    return (
                                      <div key={c} style={{ background:bg, border:'0.5px solid '+borderCol, borderRadius:'5px', padding:'4px 7px', fontSize:'11px', minWidth:'72px', boxShadow: stabBest==='D'?'0 0 0 1.5px '+C.floor+'88':'none' }}>
                                        <div style={{ fontWeight:500, color:labelCol, fontFamily:'var(--font-mono)', fontSize:'10px', marginBottom:'1px', display:'flex', alignItems:'center', gap:'4px' }}>
                                          {c}
                                          {stabBest==='D' && <span style={{ fontSize:'9px', color:C.floor, background:C.floorBg, padding:'0 3px', borderRadius:'2px', fontFamily:'var(--font-sans)' }}>NEW</span>}
                                        </div>
                                        <div style={{ color:C.mu, fontSize:'10px' }}>{info.s}{info.t==='crit'?' ★':''}</div>
                                        <div style={{ marginTop:'2px', display:'flex', alignItems:'center', gap:'2px' }}>
                                          <span style={{ color:symCol(ms) }}>{SYM[ms]}</span>
                                          <span style={{ color:C.dim }}>·</span>
                                          <span style={{ color:symCol(fs) }}>{SYM[fs]}</span>
                                          <span style={{ color:pctCol, fontWeight:500, marginLeft:'3px', fontSize:'10px' }}>{erPct}%</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                            }
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        );
      })()}

      {/* ── MANAGE ── */}
      {tab === 'manage' && (
        <div>
          {specimens.length === 0
            ? <p style={{ color:C.mu, fontSize:'14px' }}>No specimens in stable.</p>
            : <>
                <p style={{ fontSize:'12px', color:C.floor, margin:'0 0 12px', lineHeight:1.7 }}>
                  Specimens are ordered safest → riskiest to remove. Click the × on any specimen to attempt removal — you'll first see a detailed breakdown of exactly what would be lost from the gene pool before you confirm.
                  Folders and their colors are set on the Stable tab; every card in a colored folder carries that color across every tab (Pairs, Manage, Gene Map), so you can track bloodlines at a glance.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                  {delList.map(({ s, critR, uniq, score, risk, isOnly }) => {
                    const inPairs = pairedIds.has(s.id);
                    const rm = {
                      safe:   { label:'Safe to remove',  color:C.safe,    bg:C.safeBg    },
                      caution:{ label:'Caution',          color:C.caution, bg:C.cautionBg },
                      danger: { label:'Do not remove',   color:C.danger,  bg:C.dangerBg  },
                    }[risk];
                    const gColor = s.gender==='male'?'#60A5FA':s.gender==='female'?'#F472B6':C.mu;
                    const gSym = s.gender==='male'?'♂':s.gender==='female'?'♀':'?';
                    const notPaired = !inPairs && specimens.length > 1;
                    const mutR = calcStats(s).mutR;
                    return (
                      <div key={s.id} style={{ background:C.card, opacity: notPaired ? 0.72 : 1, border: specColor(s) ? '0.5px solid '+specColor(s) : notPaired ? '1px dashed '+C.mu : '0.5px solid '+C.b, borderRadius:'10px', padding:'12px 14px', boxShadow: specColor(s) ? 'inset 3px 0 0 '+specColor(s) : 'none' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'8px', marginBottom:'8px' }}>
                          <div>
                            <div style={{ fontWeight:500, fontSize:'13px', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                              <span><span style={{ color:gColor, marginRight:'4px', fontWeight:600 }}>{gSym}</span>{s.name}</span>
                              {folderName(s.folderId ?? null) && <FolderTag name={folderName(s.folderId ?? null)} color={specColor(s)} />}
                            </div>
                            <div style={{ fontSize:'11px', color:C.mu, marginTop:'2px' }}>score {score} &middot; {critR.length} critical 〇{mutR > 0 && <span style={{ color:C.gem }}> &middot; 💎 {mutR} paramount 〇</span>}</div>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                            {notPaired && (
                              <span style={{ fontSize:'11px', fontWeight:500, padding:'3px 7px', borderRadius:'4px', background:'transparent', color:C.mu, border:'1px dashed '+C.mu, whiteSpace:'nowrap' }}>⊘ Not paired</span>
                            )}
                            <span style={{ fontSize:'11px', fontWeight:500, padding:'3px 8px', borderRadius:'4px', background:rm.bg, color:rm.color, whiteSpace:'nowrap' }}>{rm.label}</span>
                            <button onClick={() => setDeleteCandidate(s)} title="Remove from stable" style={{ border:'none', background:'none', cursor:'pointer', color:C.dim, fontSize:'17px', padding:'0 2px', lineHeight:1, flexShrink:0 }}>×</button>
                          </div>
                        </div>
                        {isOnly && (
                          <div style={{ fontSize:'11px', color:C.caution, background:C.cautionBg, padding:'3px 7px', borderRadius:'4px', display:'inline-block', marginBottom:'5px' }}>
                            Only {s.gender} in stable — removing breaks all pairings
                          </div>
                        )}
                        {uniq.length > 0 && (
                          <div style={{ fontSize:'11px', color:C.danger, background:C.dangerBg, padding:'6px 8px', borderRadius:'5px', marginBottom:'4px' }}>
                            <div style={{ fontWeight:500, marginBottom:'4px' }}>Unique critical genes — not found in any other specimen:</div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                              {uniq.map(({ c, stat }) => (
                                <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'10px', background:'#2A0808', padding:'2px 6px', borderRadius:'3px', color:C.danger }}>{c} ({stat})</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {critR.length > 0 && uniq.length === 0 && (
                          <div style={{ fontSize:'11px', color:C.mu, display:'flex', flexWrap:'wrap', gap:'4px', alignItems:'center' }}>
                            <span style={{ marginRight:'2px' }}>Critical 〇:</span>
                            {critR.map(({ c, stat }) => (
                              <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'10px', background:C.critBg, color:C.crit, padding:'2px 6px', borderRadius:'3px' }}>{c} ({stat})</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
          }
        </div>
      )}
      {/* ── ANALYZE ── */}
      {tab === 'analyze' && (() => {
        const ar = analyzeResult;
        const analysis = ar ? (() => {
          const newCritR=[], newCritX=[], newStdR=[], newStdX=[];
          const upgradesCrit=[], upgradesStd=[];
          const confirmsCrit=[], confirmsStd=[];
          let specimenMixed=0, weightedScore=0;
          for (const [c, info] of Object.entries(SG)) {
            if (info.t === 'floor' || info.t === 'orange') continue;
            const v = ar.genome[c] || 'D';
            if (v === '?' || v === 'D') continue;
            const stabBest = cov[c]?.best ?? 'D';
            const isCrit = info.t === 'crit' || info.t === 'gem';
            const w = W[info.t] || 1;
            if (v === 'R') {
              weightedScore += w;
              if      (stabBest === 'D') isCrit ? newCritR.push({c,info}) : newStdR.push({c,info});
              else if (stabBest === 'x') isCrit ? upgradesCrit.push({c,info}) : upgradesStd.push({c,info});
              else                       isCrit ? confirmsCrit.push({c,info}) : confirmsStd.push({c,info});
            } else if (v === 'x') {
              specimenMixed++;
              // mixed genes don't contribute to score — they give no stat bonus currently
              if (stabBest === 'D') isCrit ? newCritX.push({c,info}) : newStdX.push({c,info});
            }
          }
          const foldInGen = specimenMixed <= 2 ? 'minimal cleanup' :
                            specimenMixed <= 6 ? '~3 back-cross gen' :
                            specimenMixed <= 12 ? '~4 back-cross gen' : '~5+ back-cross gen';
          return { newCritR, newCritX, newStdR, newStdX, upgradesCrit, upgradesStd,
                   confirmsCrit, confirmsStd, specimenMixed, weightedScore, foldInGen };
        })() : null;

        return (
          <div>
            <BulkImport onAddMany={specs => {
              const updated = [...specimens, ...specs];
              setSpecimens(updated); persist(updated);
              setTab('stable');
            }} />
            <div style={{ borderTop:'0.5px solid '+C.b, margin:'4px 0 14px' }} />
            <p style={{ fontSize:'13px', color:C.mu, margin:'0 0 10px', lineHeight:1.6 }}>
              When scouting out bees, paste a single genome export here to get a detailed breakdown of how that specimen's genetics might affect your overall gene pool — then add it (with gender) from the bottom of the analysis if you want to keep it.
            </p>
            <textarea value={analyzeInput} onChange={e => setAnalyzeInput(e.target.value)}
              placeholder={'[Overview]\nFormat=v1.0\nEntity=Specimen Name\n\n[Genes]\n01= RDRD ...'}
              style={{ width:'100%', minHeight:'120px', fontFamily:'var(--font-mono)', fontSize:'12px', padding:'10px', boxSizing:'border-box', resize:'vertical', borderRadius:'8px', border:'0.5px solid '+C.b, background:C.sf, color:C.tx, outline:'none', lineHeight:1.5 }}
            />
            {analyzeErr && <p style={{ color:C.danger, fontSize:'12px', margin:'4px 0 0' }}>{analyzeErr}</p>}
            <div style={{ display:'flex', gap:'8px', marginTop:'8px', flexWrap:'wrap', alignItems:'center' }}>
              <button onClick={analyzeSpecimen} style={{ padding:'7px 18px', fontSize:'13px', cursor:'pointer' }}>Analyze</button>
              {ar && <button onClick={() => { setAnalyzeResult(null); setAnalyzeInput(''); setAnalyzeGender('unknown'); }} style={{ padding:'7px 14px', fontSize:'13px', cursor:'pointer', background:'transparent', color:C.mu, border:'0.5px solid '+C.b, borderRadius:'6px' }}>Clear</button>}
            </div>

            {ar && analysis && (
              <div style={{ marginTop:'16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                  <span style={{ fontSize:'16px', fontWeight:500, color: ar.gender==='male'?'#60A5FA':ar.gender==='female'?'#F472B6':C.mu }}>
                    {ar.gender==='male'?'♂':ar.gender==='female'?'♀':'?'}
                  </span>
                  <span style={{ fontSize:'15px', fontWeight:500 }}>{ar.name}</span>
                </div>

                <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'14px' }}>
                  <AnalyzeStatBox label={'Score'} val={analysis.weightedScore.toFixed(1)} color={C.tx} />
                  <AnalyzeStatBox label={'New crit recessive'} val={analysis.newCritR.length} color={C.crit} sub={analysis.newCritX.length > 0 ? '+'+analysis.newCritX.length+' as mixed' : ''} />
                  <AnalyzeStatBox label={'New std recessive'} val={analysis.newStdR.length} color={C.std} sub={analysis.newStdX.length > 0 ? '+'+analysis.newStdX.length+' as mixed' : ''} />
                  <AnalyzeStatBox label={'Upgrades pool'} val={analysis.upgradesCrit.length + analysis.upgradesStd.length} color={'#60A5FA'} />
                  <AnalyzeStatBox label={'Mixed stat genes'} val={analysis.specimenMixed} color={analysis.specimenMixed > 15 ? C.danger : analysis.specimenMixed > 8 ? C.caution : C.mu} sub={analysis.foldInGen} />
                  {calcStats(ar).mutR > 0 && <AnalyzeStatBox label={'Paramount 〇 (mutation)'} val={calcStats(ar).mutR} color={C.gem} sub={'mutation-only'} />}
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:'8px', marginBottom:'14px' }}>
                  {analysis.newCritR.length > 0 && (
                    <div style={{ background:C.critBg, border:'0.5px solid '+C.crit, borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:600, color:C.crit, marginBottom:'6px' }}>New critical genes — recessive, not in stable</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {analysis.newCritR.map(({c,info}) => <AnalyzeChip key={c} c={c} info={info} col={C.crit} bg={'#1A1000'} />)}
                      </div>
                    </div>
                  )}
                  {analysis.newCritX.length > 0 && (
                    <div style={{ background:'#150D00', border:'0.5px solid '+C.caution+'88', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:C.caution, marginBottom:'6px' }}>New critical genes — mixed only</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {analysis.newCritX.map(({c,info}) => <AnalyzeChip key={c} c={c} info={info} col={C.caution} bg={'#1A1000'} />)}
                      </div>
                    </div>
                  )}
                  {analysis.newStdR.length > 0 && (
                    <div style={{ background:C.stdBg, border:'0.5px solid '+C.std+'88', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:C.std, marginBottom:'6px' }}>New standard genes — recessive, not in stable</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {analysis.newStdR.map(({c,info}) => <AnalyzeChip key={c} c={c} info={info} col={C.std} bg={'#050F08'} />)}
                      </div>
                    </div>
                  )}
                  {analysis.newStdX.length > 0 && (
                    <div style={{ background:'#0D0D00', border:'0.5px solid #5A5000', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:'#9A9030', marginBottom:'6px' }}>New standard genes — mixed only</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {analysis.newStdX.map(({c,info}) => <AnalyzeChip key={c} c={c} info={info} col={'#9A9030'} bg={'#141000'} />)}
                      </div>
                    </div>
                  )}
                  {(analysis.upgradesCrit.length + analysis.upgradesStd.length) > 0 && (
                    <div style={{ background:'#030C22', border:'0.5px solid #3060A0', borderRadius:'8px', padding:'10px 12px' }}>
                      <div style={{ fontSize:'12px', fontWeight:500, color:'#60A5FA', marginBottom:'6px' }}>Upgrades pool — stable has mixed, this has clean recessive</div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                        {[...analysis.upgradesCrit, ...analysis.upgradesStd].map(({c,info}) => <AnalyzeChip key={c} c={c} info={info} col={'#60A5FA'} bg={'#050C1A'} />)}
                      </div>
                    </div>
                  )}
                  {(analysis.confirmsCrit.length + analysis.confirmsStd.length) > 0 && (
                    <div style={{ background:'#071A0E', border:'0.5px solid #1A4030', borderRadius:'8px', padding:'8px 12px' }}>
                      <div style={{ fontSize:'11px', color:'#2A6040' }}>
                        Confirms {analysis.confirmsCrit.length} crit + {analysis.confirmsStd.length} std already in stable (redundancy only)
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom:'12px' }}>
                  <div style={{ fontSize:'12px', color:C.mu, marginBottom:'8px', fontWeight:500 }}>Genome map — coloured by contribution to stable</div>
                  {specimens.length === 0 && <div style={{ fontSize:'11px', color:C.caution, marginBottom:'6px' }}>No stable loaded — gene states shown without comparison</div>}
                  <AnalyzeGeneMap s={ar} cov={cov} />
                </div>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:'10px', flexWrap:'wrap', paddingTop:'4px', borderTop:'0.5px solid '+C.b, marginTop:'4px' }}>
                  <div style={{ fontSize:'12px', color:C.mu }}>Gender before adding:</div>
                  <select
                    value={analyzeGender}
                    onChange={e => setAnalyzeGender(e.target.value)}
                    style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(analyzeGender==='unknown'?C.danger:C.b), background:C.sf, color: analyzeGender==='male'?'#60A5FA':analyzeGender==='female'?'#F472B6':C.danger, fontSize:'13px', cursor:'pointer', fontWeight:500, outline:'none' }}
                  >
                    <option value="unknown" style={{ color:C.danger }}>— Select gender —</option>
                    <option value="male" style={{ color:'#60A5FA' }}>♂ Male</option>
                    <option value="female" style={{ color:'#F472B6' }}>♀ Female</option>
                  </select>
                  <button
                    disabled={analyzeGender === 'unknown'}
                    onClick={() => {
                      const updated = [...specimens, { ...ar, gender: analyzeGender, id: Date.now()+'-eval' }];
                      setSpecimens(updated); persist(updated);
                      setAnalyzeResult(null); setAnalyzeInput(''); setAnalyzeGender('unknown');
                      setTab('stable');
                    }}
                    style={{ padding:'8px 20px', borderRadius:'7px', border:'0.5px solid '+(analyzeGender==='unknown'?C.b:C.std), background: analyzeGender==='unknown'?'transparent':C.stdBg, color: analyzeGender==='unknown'?C.dim:C.std, fontSize:'13px', fontWeight:500, cursor: analyzeGender==='unknown'?'not-allowed':'pointer', opacity: analyzeGender==='unknown'?0.45:1 }}
                  >
                    + Add to stable
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── GENE MAP ── */}
      {tab === 'genes' && (() => {
        if (specimens.length === 0) return <p style={{ color:C.mu, fontSize:'14px' }}>No specimens loaded. Use Import to add genome exports.</p>;

        // Cell color by coverage state + tier
        const cellStyle = (coord) => {
          const entry = cov[coord];
          if (!entry) return { bg:'transparent', border:'transparent', show:false };
          const { best, info } = entry;
          const isCrit = info.t === 'crit' || info.t === 'gem';
          const border = isCrit ? C.crit : info.t==='gem' ? C.gem : C.b;
          if (best === 'floor')  return { bg:'#0C2A1E', border:'#1A4A30', show:true, dim:true };
          // Orange/paramount: mutation-only — always outlined purple to mark it; lights up when a 〇 mutation is present
          if (info.t === 'orange') {
            if (best === 'R') return { bg:C.gemBg, border:C.gem, show:true, bright:C.gem, mut:true };
            if (best === 'x') return { bg:'#1A1200', border:C.gem, show:true, bright:'#FCD34D', mut:true };
            return { bg:'#150B00', border:C.gem, show:true, dim:true, mut:true };
          }
          if (best === 'locked') return { bg:'#1A1200', border:'#3A2800', show:true, dim:true };
          if (best === 'R')      return { bg: isCrit ? '#0C2200' : '#082010', border: isCrit ? '#4A7A00' : '#1A5030', show:true, bright:'#34D399' };
          if (best === 'x')      return { bg:'#1A1200', border:'#5A4000', show:true, bright:'#FCD34D' };
          /* D */                return { bg: isCrit ? '#2A0808' : '#180808', border: isCrit ? C.danger : '#3A1010', show:true, bright: isCrit ? '#F87171' : '#7A2020' };
        };

        // Derive max group per chromosome from SG keys
        const chrMaxGroup = {};
        for (const cr of CRS) chrMaxGroup[cr] = 0;
        for (const c of Object.keys(SG)) {
          const cr = c.slice(0,2); const gi = c.charCodeAt(2)-65;
          if (chrMaxGroup[cr] !== undefined) chrMaxGroup[cr] = Math.max(chrMaxGroup[cr], gi);
        }

        const critMissing = Object.entries(cov).filter(([,{best,info}]) => best==='D' && (info.t==='crit'||info.t==='gem')).sort(([a],[b])=>a.localeCompare(b));
        const critInProg  = Object.entries(cov).filter(([,{best,info}]) => best==='x' && (info.t==='crit'||info.t==='gem')).sort(([a],[b])=>a.localeCompare(b));
        const stdMissing  = Object.entries(cov).filter(([,{best,info}]) => best==='D' && info.t==='std').sort(([a],[b])=>a.localeCompare(b));
        const stdInProg   = Object.entries(cov).filter(([,{best,info}]) => best==='x' && info.t==='std').sort(([a],[b])=>a.localeCompare(b));

        const hov = hoveredGene ? cov[hoveredGene] : null;

        return (
          <div>
            {/* Summary bar */}
            <div style={{ display:'flex', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
              {[
                { label:`Critical covered`, val:`${critCov}/${critTotal}`, color:C.crit, sub: critProg>0?`${critProg} in progress`:'' },
                { label:`Standard covered`, val:`${stdCov}/${stdTotal}`,  color:C.std,  sub: stdProg>0?`${stdProg} in progress`:'' },
                { label:`Paramount 〇 (mutation)`, val:`${mutCov}/${mutTotal}`, color:C.gem, sub: mutProg>0?`${mutProg} in progress`:'mutation-only' },
                { label:`Critical missing`, val:critTotal-critCov-critProg, color:C.danger, sub:'' },
                { label:`Standard missing`, val:stdTotal-stdCov-stdProg,   color:C.mu,    sub:'' },
              ].map(({ label, val, color, sub }) => (
                <div key={label} style={{ background:C.card, border:'0.5px solid '+C.b, borderRadius:'8px', padding:'8px 12px', flex:'1 1 130px', minWidth:0 }}>
                  <div style={{ fontSize:'18px', fontWeight:500, color }}>{val}</div>
                  <div style={{ fontSize:'11px', color:C.mu }}>{label}</div>
                  {sub && <div style={{ fontSize:'10px', color:C.caution, marginTop:'1px' }}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* Hover info bar */}
            <div style={{ minHeight:'32px', marginBottom:'10px', padding:'6px 10px', borderRadius:'6px', background:C.sf, border:'0.5px solid '+C.b, fontSize:'12px', color: hov ? C.tx : C.dim }}>
              {hov
                ? <>
                    <span style={{ fontFamily:'var(--font-mono)', color:C.crit, marginRight:'8px' }}>{hoveredGene}</span>
                    <span style={{ marginRight:'8px' }}>
                      <span style={{ color:statCol(hov.info.s), fontWeight:500 }}>{hov.info.s}</span>
                      {hov.info.v>0 && <span style={{ color:valCol(hov.info.v), fontWeight:500, marginLeft:'4px' }}>v:{hov.info.v}</span>}
                      {(hov.info.t==='crit'||hov.info.t==='gem') && <span style={{ color:C.crit }}> ★</span>}
                    </span>
                    <span style={{ color: hov.best==='R'?C.std : hov.best==='x'?C.caution : hov.best==='floor'?C.floor : hov.best==='locked'?C.mu : C.danger }}>
                      {hov.best==='R'?'〇 Covered':hov.best==='x'?'⦿ In progress (⦿ only)':hov.best==='floor'?'〇 Floor (always recessive)':hov.best==='locked'?'⬤ Locked (orange gene)':'⬤ Missing — no specimen has this gene'}
                    </span>
                    <span style={{ fontSize:'11px', color:C.mu, marginLeft:'8px', textTransform:'capitalize' }}>tier: {hov.info.t}</span>
                  </>
                : <span>Hover a cell for details · click for the stable breakdown</span>
              }
            </div>

            {/* Genome grid */}
            <div style={{ overflowX:'auto', marginBottom:'16px' }}>
              <div style={{ minWidth:'fit-content' }}>
                {/* Column headers — one per group */}
                <div style={{ display:'flex', gap:'3px', marginBottom:'4px', paddingLeft:'36px' }}>
                  {GROUPS.map(g => (
                    <div key={g} style={{ width:'62px', textAlign:'center', fontSize:'10px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0 }}>{g}</div>
                  ))}
                </div>
                {CRS.map(cr => {
                  const maxGi = chrMaxGroup[cr] ?? 0;
                  return (
                    <div key={cr} style={{ display:'flex', alignItems:'center', gap:'3px', marginBottom:'3px' }}>
                      <div style={{ width:'32px', fontSize:'10px', color:C.mu, fontFamily:'var(--font-mono)', flexShrink:0, textAlign:'right', paddingRight:'4px' }}>CR{cr}</div>
                      {GROUPS.map((g, gi) => {
                        const isActive = gi <= maxGi;
                        return (
                          <div key={g} style={{ display:'flex', gap:'2px', width:'62px', flexShrink:0, opacity: isActive ? 1 : 0.15 }}>
                            {[1,2,3,4].map(p => {
                              const coord = cr + g + p;
                              const cs = cellStyle(coord);
                              if (!cs.show) return (
                                <div key={p} style={{ width:'13px', height:'13px', borderRadius:'2px', background:'#0D0F18', border:'0.5px solid #1A1E2F', flexShrink:0 }} />
                              );
                              return (
                                <div key={p}
                                  onMouseEnter={() => setHoveredGene(coord)}
                                  onMouseLeave={() => setHoveredGene(null)}
                                  onClick={() => setSelectedGene(selectedGene === coord ? null : coord)}
                                  style={{ width:'13px', height:'13px', borderRadius:'2px', background: cs.bright || cs.bg, border:(cs.mut?'1px':'0.5px')+' solid '+cs.border, flexShrink:0, cursor:'pointer', transition:'transform 0.05s', boxShadow: selectedGene===coord ? '0 0 0 2px #fff' : hoveredGene===coord ? '0 0 0 1.5px #fff4' : 'none' }}
                                />
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected gene — per-specimen breakdown */}
            {selectedGene && SG[selectedGene] && (() => {
              const info = SG[selectedGene];
              const rec = [], mix = [], dom = [];
              for (const s of specimens) {
                const v = s.genome[selectedGene] || 'D';
                (v === 'R' ? rec : v === 'x' ? mix : dom).push(s);
              }
              const chip = (s, col) => (
                <span key={s.id} style={{ fontSize:'11px', padding:'2px 8px', borderRadius:'4px', background:C.sf, color:C.tx, border:'0.5px solid '+col+'55', display:'inline-flex', alignItems:'center', gap:'4px' }}>
                  <span style={{ color: s.gender==='male'?'#60A5FA':s.gender==='female'?'#F472B6':C.mu, fontWeight:600 }}>{s.gender==='male'?'♂':s.gender==='female'?'♀':'?'}</span>{s.name}
                </span>
              );
              const tierCol = (info.t==='crit'||info.t==='gem') ? C.crit : info.t==='orange' ? C.gem : info.t==='floor' ? C.floor : C.std;
              const group = (label, list, col) => (
                <div>
                  <div style={{ fontSize:'11px', color:col, marginBottom:'4px', fontWeight:500 }}>{label} ({list.length})</div>
                  {list.length
                    ? <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>{list.map(s => chip(s, col))}</div>
                    : <div style={{ fontSize:'11px', color:C.dim }}>none</div>}
                </div>
              );
              return (
                <div style={{ marginBottom:'16px', background:C.card, border:'0.5px solid '+tierCol+'66', borderRadius:'10px', padding:'12px 14px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'8px' }}>
                    <div style={{ fontSize:'13px' }}>
                      <span style={{ fontFamily:'var(--font-mono)', color:C.crit, fontWeight:500, marginRight:'8px' }}>{selectedGene}</span>
                      <span style={{ color:C.tx, fontWeight:500 }}>{info.s}</span>
                      <span style={{ color:tierCol, fontSize:'11px', marginLeft:'8px', textTransform:'capitalize' }}>{info.t}{(info.t==='crit'||info.t==='gem')?' ★':''}{info.v>0?' · v:'+info.v:''}</span>
                    </div>
                    <button onClick={() => setSelectedGene(null)} style={{ border:'none', background:'none', cursor:'pointer', color:C.mu, fontSize:'16px', lineHeight:1, padding:0, flexShrink:0 }}>×</button>
                  </div>
                  {specimens.length === 0
                    ? <div style={{ fontSize:'12px', color:C.mu }}>No specimens in stable.</div>
                    : <div style={{ display:'flex', flexDirection:'column', gap:'9px' }}>
                        {group('〇 Recessive — breeds true', rec, C.std)}
                        {group('⦿ Mixed — carrier, unpredictable', mix, C.caution)}
                        {group('⬤ Dominant — lacks it', dom, C.mu)}
                      </div>
                  }
                </div>
              );
            })()}

            {/* Legend */}
            <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'18px', fontSize:'11px', color:C.mu }}>
              {[
                { col:'#34D399', label:'Covered 〇' },
                { col:'#FCD34D', label:'In progress ⦿' },
                { col:'#F87171', label:'Missing (critical)' },
                { col:'#7A2020', label:'Missing (standard)' },
                { col:'#0C2A1E', label:'Floor (always 〇)' },
              ].map(({ col, label }) => (
                <div key={label} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                  <div style={{ width:'11px', height:'11px', borderRadius:'2px', background:col, flexShrink:0 }} />
                  {label}
                </div>
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'11px', height:'11px', borderRadius:'2px', background:'#2A0808', border:'0.5px solid '+C.danger, flexShrink:0 }} />
                ★ border = critical tier
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                <div style={{ width:'11px', height:'11px', borderRadius:'2px', background:'#150B00', border:'1px solid '+C.gem, flexShrink:0 }} />
                💎 purple outline = mutation (paramount)
              </div>
            </div>

            {/* Missing gene lists */}
            {(critMissing.length > 0 || critInProg.length > 0) && (
              <div style={{ marginBottom:'14px' }}>
                <div style={{ fontSize:'12px', fontWeight:500, color:C.crit, marginBottom:'7px' }}>Critical — Missing or In Progress</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {critMissing.map(([c,{info}]) => (
                    <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:C.dangerBg, color:C.danger, padding:'3px 7px', borderRadius:'4px', border:'0.5px solid #3A1010' }}>{c} <span style={{ color:C.mu }}>({info.s})</span> <span style={{ color:C.danger, fontSize:'10px' }}>missing</span></span>
                  ))}
                  {critInProg.map(([c,{info}]) => (
                    <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:C.cautionBg, color:C.caution, padding:'3px 7px', borderRadius:'4px', border:'0.5px solid #3A2000' }}>{c} <span style={{ color:C.mu }}>({info.s})</span> <span style={{ color:C.caution, fontSize:'10px' }}>⦿ only</span></span>
                  ))}
                </div>
              </div>
            )}
            {(stdMissing.length > 0 || stdInProg.length > 0) && (
              <div>
                <div style={{ fontSize:'12px', fontWeight:500, color:C.mu, marginBottom:'7px' }}>Standard — Missing or In Progress</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px' }}>
                  {stdMissing.map(([c,{info}]) => (
                    <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:'#180808', color:'#A05050', padding:'3px 7px', borderRadius:'4px', border:'0.5px solid #2A1010' }}>{c} <span style={{ color:C.dim }}>({info.s})</span></span>
                  ))}
                  {stdInProg.map(([c,{info}]) => (
                    <span key={c} style={{ fontFamily:'var(--font-mono)', fontSize:'11px', background:'#0F0D00', color:'#8A7A30', padding:'3px 7px', borderRadius:'4px', border:'0.5px solid #2A2000' }}>{c} <span style={{ color:C.dim }}>({info.s})</span> <span style={{ fontSize:'10px' }}>⦿</span></span>
                  ))}
                </div>
              </div>
            )}
            {critMissing.length===0 && critInProg.length===0 && stdMissing.length===0 && stdInProg.length===0 && (
              <p style={{ color:C.std, fontSize:'13px' }}>All tracked stat genes are covered in your stable.</p>
            )}
          </div>
        );
      })()}
    </div>
    </div>
  );
}

