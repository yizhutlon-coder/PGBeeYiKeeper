import { useState } from 'react';
import { SYM, STAT_COORDS } from './data/geneData.js';
import { expR, tierWeight, scorePairPool, specimenScore, poolCoverage } from './lib/genetics.js';
import { C, symCol } from './lib/theme.js';
import CoverageMap from './components/CoverageMap.jsx';
import ImportPanel from './components/ImportPanel.jsx';
import ForecastView from './components/ForecastView.jsx';

const STORE = 'pg-planner-v2';

// ── STORAGE ───────────────────────────────────────────────────────────────────
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) return JSON.parse(raw);
    // Migrate from v1 if present
    const v1 = localStorage.getItem('pg-planner-v1');
    if (v1) {
      const d = JSON.parse(v1);
      const id = 'proj-' + Date.now();
      return { projects:[{id, name:'Project 1'}], active:id, data:{[id]:{parents:d.parents||{a:null,b:null}, pool:d.pool||[]}} };
    }
  } catch(e) {}
  const id = 'proj-' + Date.now();
  return { projects:[{id, name:'New Project'}], active:id, data:{[id]:{parents:{a:null,b:null}, pool:[]}} };
}

function saveStore(s) {
  try { localStorage.setItem(STORE, JSON.stringify(s)); } catch(e) {}
}
// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function Planner() {
  const [store, setStore] = useState(() => loadStore());
  const [tab, setTab] = useState('plan');
  const [expanded, setExpanded] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [addingParent, setAddingParent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // project id to confirm delete
  const [renamingId, setRenamingId] = useState(null);
  const [renameVal, setRenameVal] = useState('');
  const [newProjName, setNewProjName] = useState('');
  const [showNewProj, setShowNewProj] = useState(false);

  function persist(s) { setStore(s); saveStore(s); }

  // Active project helpers
  const activeId = store.active;
  const activeProj = store.projects.find(p => p.id === activeId) || store.projects[0];
  const activeData = store.data[activeId] || {parents:{a:null,b:null}, pool:[]};
  const { parents, pool } = activeData;

  function updateActiveData(newData) {
    const ns = {...store, data:{...store.data, [activeId]: newData}};
    persist(ns);
  }

  function setParent(which, specimen) {
    updateActiveData({...activeData, parents:{...parents, [which]: specimen ? {...specimen, role:which} : null}});
    setAddingParent(null);
  }

  function addOffspring(specimen) {
    updateActiveData({...activeData, pool:[...pool, specimen]});
    setShowImport(false);
  }

  function removeSpecimen(id) {
    updateActiveData({...activeData, pool: pool.filter(s => s.id !== id)});
  }

  // Project management
  function switchProject(id) {
    persist({...store, active:id});
    setTab('plan'); setExpanded(null); setShowImport(false); setAddingParent(null);
  }

  function createProject(name) {
    const id = 'proj-' + Date.now();
    const ns = {
      ...store,
      projects: [...store.projects, {id, name: name.trim() || 'New Project'}],
      active: id,
      data: {...store.data, [id]: {parents:{a:null,b:null}, pool:[]}}
    };
    persist(ns);
    setShowNewProj(false); setNewProjName('');
    setTab('plan'); setExpanded(null); setShowImport(false); setAddingParent(null);
  }

  function deleteProject(id) {
    if (store.projects.length <= 1) return;
    const newProjects = store.projects.filter(p => p.id !== id);
    const newData = {...store.data}; delete newData[id];
    const newActive = store.active === id ? newProjects[0].id : store.active;
    persist({...store, projects:newProjects, active:newActive, data:newData});
    setConfirmDelete(null);
    if (store.active === id) { setTab('plan'); setExpanded(null); setShowImport(false); setAddingParent(null); }
  }

  function commitRename(id) {
    if (!renameVal.trim()) { setRenamingId(null); return; }
    persist({...store, projects: store.projects.map(p => p.id===id ? {...p, name:renameVal.trim()} : p)});
    setRenamingId(null); setRenameVal('');
  }

  // Derived
  const allSpecs = [parents.a, parents.b, ...pool].filter(Boolean);
  const males = pool.filter(s => s.gender==='male');
  const females = pool.filter(s => s.gender==='female');
  const cov = poolCoverage(allSpecs);
  const locked = STAT_COORDS.filter(([c]) => cov[c]==='R').length;
  const inProg = STAT_COORDS.filter(([c]) => cov[c]==='x').length;
  const total = STAT_COORDS.length;
  const rankedPool = [...pool].sort((a,b) => specimenScore(b)-specimenScore(a));
  const bestSpec = rankedPool[0];
  const bestScore = bestSpec ? specimenScore(bestSpec) : 0;
  const currentGen = pool.length > 0 ? Math.max(...pool.map(s => s.gen||1)) : 1;

  const recommendations = (() => {
    if (!males.length || !females.length) return [];
    const pairs = [];
    for (const m of males) for (const f of females) {
      const score = scorePairPool(m, f, allSpecs);
      const clarify = STAT_COORDS.filter(([c]) => { const ms=m.genome[c]||'D',fs=f.genome[c]||'D'; return (ms==='x'&&fs==='R')||(ms==='R'&&fs==='x'); }).length;
      const recover = STAT_COORDS.filter(([c]) => (m.genome[c]||'D')==='x'&&(f.genome[c]||'D')==='x').length;
      const newPool = STAT_COORDS.filter(([c]) => cov[c]!=='R' && ((m.genome[c]||'D')!=='D'||(f.genome[c]||'D')!=='D') && ((m.genome[c]||'D')==='R'||(f.genome[c]||'D')==='R'||(m.genome[c]||'D')==='x'||(f.genome[c]||'D')==='x')).length;
      const dilutes = STAT_COORDS.filter(([c]) => { const ms=m.genome[c]||'D',fs=f.genome[c]||'D'; return (ms==='R'&&fs==='D')||(ms==='D'&&fs==='R'); }).length;
      const expectedR = STAT_COORDS.reduce((a,[c]) => a+expR(m.genome[c]||'D',f.genome[c]||'D'), 0);
      pairs.push({m,f,score,clarify,recover,newPool,dilutes,expectedR});
    }
    return pairs.sort((a,b)=>b.score-a.score).slice(0,8);
  })();

  const tStyle = id => ({
    padding:'7px 14px', border:'none', background:'none', cursor:'pointer', fontSize:'13px',
    fontWeight:tab===id?500:400, color:tab===id?C.tx:C.mu,
    borderBottom:'2px solid '+(tab===id?C.crit:'transparent'), marginBottom:'-1px', whiteSpace:'nowrap',
  });

  const setupDone = !!(parents.a && parents.b);

  return (
    <div style={{background:C.bg,color:C.tx,fontFamily:'var(--font-sans)',padding:'16px',borderRadius:'12px',minHeight:'100%'}}>

      {/* ── PROJECT BAR ── */}
      <div style={{marginBottom:'14px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0',overflowX:'auto',borderBottom:'1px solid '+C.b,paddingBottom:'0'}}>
          {store.projects.map(proj => {
            const isActive = proj.id === activeId;
            const isRenaming = renamingId === proj.id;
            const isConfirmDel = confirmDelete === proj.id;
            return (
              <div key={proj.id} style={{display:'flex',alignItems:'center',gap:'4px',padding:'7px 12px',cursor:'pointer',borderBottom:'2px solid '+(isActive?C.std:'transparent'),marginBottom:'-1px',background:isActive?C.sf:'transparent',borderRadius:'8px 8px 0 0',flexShrink:0}}>
                {isRenaming ? (
                  <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                    onBlur={()=>commitRename(proj.id)}
                    onKeyDown={e=>{if(e.key==='Enter')commitRename(proj.id);if(e.key==='Escape'){setRenamingId(null);setRenameVal('');}}}
                    style={{background:'transparent',border:'none',borderBottom:'1px solid '+C.std,outline:'none',color:C.tx,fontSize:'13px',width:'120px',padding:'0'}}
                  />
                ) : isConfirmDel ? (
                  <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
                    <span style={{fontSize:'11px',color:C.danger}}>Delete?</span>
                    <button onClick={e=>{e.stopPropagation();deleteProject(proj.id);}} style={{fontSize:'11px',padding:'2px 7px',cursor:'pointer',background:C.dangerBg,color:C.danger,border:'0.5px solid '+C.danger,borderRadius:'3px'}}>Yes</button>
                    <button onClick={e=>{e.stopPropagation();setConfirmDelete(null);}} style={{fontSize:'11px',padding:'2px 7px',cursor:'pointer',background:'transparent',color:C.mu,border:'0.5px solid '+C.b,borderRadius:'3px'}}>No</button>
                  </div>
                ) : (
                  <>
                    <span onClick={()=>switchProject(proj.id)} style={{fontSize:'13px',color:isActive?C.tx:C.mu,maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.name}</span>
                    {isActive && (
                      <button onClick={e=>{e.stopPropagation();setRenamingId(proj.id);setRenameVal(proj.name);}} title="Rename"
                        style={{background:'none',border:'none',cursor:'pointer',color:C.dim,fontSize:'11px',padding:'0 2px',lineHeight:1}}>✎</button>
                    )}
                    {store.projects.length > 1 && (
                      <button onClick={e=>{e.stopPropagation();setConfirmDelete(proj.id);}} title="Delete project"
                        style={{background:'none',border:'none',cursor:'pointer',color:C.dim,fontSize:'13px',padding:'0 2px',lineHeight:1}}>×</button>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {/* New project button / input */}
          {showNewProj ? (
            <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'4px 10px',flexShrink:0}}>
              <input autoFocus value={newProjName} onChange={e=>setNewProjName(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter')createProject(newProjName);if(e.key==='Escape'){setShowNewProj(false);setNewProjName('');}}}
                placeholder="Project name..."
                style={{background:C.sf,border:'0.5px solid '+C.b,borderRadius:'5px',outline:'none',color:C.tx,fontSize:'12px',padding:'4px 8px',width:'140px'}}
              />
              <button onClick={()=>createProject(newProjName)} style={{fontSize:'12px',padding:'4px 10px',cursor:'pointer'}}>Add</button>
              <button onClick={()=>{setShowNewProj(false);setNewProjName('');}} style={{fontSize:'12px',padding:'4px 8px',cursor:'pointer',background:'transparent',color:C.mu,border:'0.5px solid '+C.b,borderRadius:'5px'}}>Cancel</button>
            </div>
          ) : (
            <button onClick={()=>setShowNewProj(true)} title="New project"
              style={{padding:'7px 12px',background:'none',border:'none',cursor:'pointer',color:C.mu,fontSize:'18px',lineHeight:1,flexShrink:0,marginBottom:'-1px'}}>+</button>
          )}
        </div>
      </div>

      {/* ── HEADER ── */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontSize:'12px',color:C.mu}}>
          {pool.length} offspring
          {setupDone && <span> &middot; {locked}/{total} locked &middot; {inProg} in progress</span>}
        </div>
        {setupDone && (
          <button onClick={()=>setShowImport(v=>!v)}
            style={{padding:'5px 12px',fontSize:'12px',cursor:'pointer',background:showImport?C.critBg:'transparent',color:showImport?C.crit:C.mu,border:'0.5px solid '+(showImport?C.crit:C.b),borderRadius:'6px'}}>
            + Add offspring
          </button>
        )}
      </div>

      {/* PROGRESS BAR */}
      {setupDone && (
        <div style={{marginBottom:'14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'11px',color:C.mu,marginBottom:'4px'}}>
            <span>Pool coverage</span>
            <span style={{color:C.std}}>{locked} / {total} genes locked</span>
          </div>
          <div style={{background:C.dim+'44',borderRadius:'4px',height:'7px',overflow:'hidden'}}>
            <div style={{width:(locked/total*100)+'%',height:'100%',background:C.std,borderRadius:'4px',transition:'width 0.4s'}}/>
          </div>
          {bestSpec && (
            <div style={{fontSize:'11px',color:C.mu,marginTop:'4px'}}>
              Best specimen: <span style={{color:C.tx,fontWeight:500}}>{bestSpec.name}</span> &mdash; score {bestScore}
            </div>
          )}
        </div>
      )}

      {/* OFFSPRING IMPORT */}
      {showImport && (
        <div style={{marginBottom:'14px'}}>
          <ImportPanel label="" buttonLabel="Add to pool" defaultGen={currentGen + 1} onAdd={addOffspring} />
        </div>
      )}

      {/* ── SETUP ── */}
      {!setupDone && (
        <div>
          <div style={{fontSize:'13px',color:C.mu,marginBottom:'12px',lineHeight:1.7}}>
            Import both parent specimens to start. Offspring are added as they arrive — the tool always shows the best current pairing.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
            {['a','b'].map(which => (
              <div key={which}>
                {parents[which] ? (
                  <div style={{background:C.card,border:'0.5px solid '+C.std,borderRadius:'10px',padding:'14px'}}>
                    <div style={{fontSize:'11px',color:C.std,marginBottom:'4px'}}>Parent {which.toUpperCase()}</div>
                    <div style={{fontSize:'14px',fontWeight:500}}>
                      <span style={{color:parents[which].gender==='male'?C.male:C.female,marginRight:'5px'}}>{parents[which].gender==='male'?'♂':'♀'}</span>
                      {parents[which].name}
                    </div>
                    <div style={{fontSize:'11px',color:C.mu,marginTop:'4px'}}>Score: {specimenScore(parents[which])}</div>
                    <button onClick={()=>setParent(which,null)}
                      style={{marginTop:'8px',fontSize:'11px',padding:'3px 8px',cursor:'pointer',background:'transparent',color:C.danger,border:'0.5px solid '+C.danger+'55',borderRadius:'4px'}}>Remove</button>
                  </div>
                ) : addingParent===which ? (
                  <ImportPanel label={'Import Parent '+which.toUpperCase()} buttonLabel="Set as Parent" onAdd={s=>setParent(which,s)} />
                ) : (
                  <div onClick={()=>setAddingParent(which)}
                    style={{background:C.sf,border:'1px dashed '+C.b,borderRadius:'10px',padding:'14px',cursor:'pointer',textAlign:'center',color:C.dim,fontSize:'13px',minHeight:'80px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'4px'}}>
                    <div style={{fontSize:'22px'}}>+</div>
                    Import Parent {which.toUpperCase()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIN TABS ── */}
      {setupDone && (
        <>
          <div style={{display:'flex',borderBottom:'1px solid '+C.b,marginBottom:'14px',overflowX:'auto'}}>
            {[['plan','Recommendations'],['forecast','Forecast'],['progress','Gene Map'],['pool','Specimens']].map(([id,lb])=>(
              <button key={id} style={tStyle(id)} onClick={()=>{setTab(id);setExpanded(null);}}>{lb}</button>
            ))}
          </div>

          {/* RECOMMENDATIONS */}
          {tab==='plan' && (
            <div>
              {recommendations.length===0 ? (
                <div style={{color:C.mu,fontSize:'13px',lineHeight:1.7}}>
                  {males.length===0&&females.length===0 ? 'No offspring imported yet.' : males.length===0 ? 'No male offspring yet.' : 'No female offspring yet.'}
                  {' '}Use "+ Add offspring" above after each breeding session.
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {recommendations.map((r,i) => {
                    const isExp = expanded===i;
                    return (
                      <div key={i} style={{background:C.card,border:'0.5px solid '+(r.newPool>0?C.floor:C.b),borderRadius:'10px',overflow:'hidden'}}>
                        <div style={{padding:'12px 14px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}} onClick={()=>setExpanded(isExp?null:i)}>
                          <div style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0,flex:1}}>
                            <span style={{background:C.sf,borderRadius:'50%',width:'26px',height:'26px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'12px',fontWeight:500,color:C.crit,flexShrink:0}}>{i+1}</span>
                            <div style={{minWidth:0,flex:1}}>
                              <div style={{fontSize:'13px',fontWeight:500,marginBottom:'5px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                <span style={{color:C.male}}>♂ {r.m.name}</span>
                                <span style={{color:C.mu,margin:'0 6px'}}>×</span>
                                <span style={{color:C.female}}>♀ {r.f.name}</span>
                              </div>
                              <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                                <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:C.sf,color:C.mu,border:'0.5px solid '+C.dim+'44'}}>{'~'+r.expectedR.toFixed(1)+' genes expected'}</span>
                                {r.clarify>0 && <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:C.floorBg,color:C.floor,border:'0.5px solid '+C.floor+'55'}}>{'clarifies '+r.clarify}</span>}
                                {r.recover>0 && <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:C.cautionBg,color:C.caution,border:'0.5px solid '+C.caution+'44'}}>{'recovers '+r.recover}</span>}
                                {r.newPool>0 && <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:C.floorBg,color:C.floor,border:'0.5px solid '+C.floor+'55',fontWeight:500}}>{'+'+r.newPool+' new to pool'}</span>}
                                {r.dilutes>0 && <span style={{fontSize:'11px',padding:'2px 7px',borderRadius:'4px',background:C.dangerBg,color:C.danger,border:'0.5px solid '+C.danger+'44'}}>{'mixes '+r.dilutes}</span>}
                              </div>
                            </div>
                          </div>
                          <span style={{color:C.dim,fontSize:'12px',flexShrink:0,marginLeft:'8px'}}>{isExp?'▲':'▼'}</span>
                        </div>
                        {isExp && (() => {
                          const m=r.m, f=r.f;
                          const detail = STAT_COORDS
                            .filter(([c]) => { const ms=m.genome[c]||'D',fs=f.genome[c]||'D'; return ms==='R'||fs==='R'||ms==='x'||fs==='x'; })
                            .map(([c,info]) => ({c,info,ms:m.genome[c]||'D',fs:f.genome[c]||'D',er:expR(m.genome[c]||'D',f.genome[c]||'D'),ps:cov[c]||'D'}))
                            .sort((a,b) => { const ap=a.ps==='D'?3:a.ps==='x'?2:1, bp=b.ps==='D'?3:b.ps==='x'?2:1; return bp-ap||(tierWeight(b.info)-tierWeight(a.info))||b.er-a.er; });
                          return (
                            <div style={{borderTop:'0.5px solid '+C.b,padding:'12px 14px',background:C.sf}}>
                              <div style={{fontSize:'11px',color:C.mu,marginBottom:'8px'}}>Active positions — new to pool first</div>
                              <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                                {detail.map(({c,info,ms,fs,er,ps}) => {
                                  const pct=Math.round(er*100), isNew=ps==='D', isProg=ps==='x';
                                  const bg=isNew?C.floorBg:isProg?C.cautionBg:er>=1?C.stdBg:er>=0.5?C.floorBg:C.dim+'22';
                                  const bdr=isNew?C.floor:isProg?C.caution:er>=1?C.std:er>=0.5?C.floor:C.b;
                                  const pc=isNew?C.floor:isProg?C.caution:er>=1?C.std:er>=0.5?C.floor:C.mu;
                                  return (
                                    <div key={c} style={{background:bg,border:'0.5px solid '+bdr,borderRadius:'5px',padding:'4px 7px',fontSize:'11px',minWidth:'70px',boxShadow:isNew?'0 0 0 1px '+C.floor+'66':undefined}}>
                                      <div style={{fontFamily:'var(--font-mono)',fontSize:'10px',fontWeight:500,color:info.t==='crit'?C.crit:C.mu,display:'flex',gap:'4px',alignItems:'center'}}>
                                        {c}{isNew&&<span style={{fontSize:'9px',color:C.floor,background:'#030C22',padding:'0 3px',borderRadius:'2px',fontFamily:'var(--font-sans)'}}>NEW</span>}
                                      </div>
                                      <div style={{fontSize:'10px',color:C.mu}}>{info.s}{info.t==='crit'?' ★':''}</div>
                                      <div style={{display:'flex',alignItems:'center',gap:'2px',marginTop:'2px'}}>
                                        <span style={{color:symCol(ms)}}>{SYM[ms]}</span>
                                        <span style={{color:C.dim}}>·</span>
                                        <span style={{color:symCol(fs)}}>{SYM[fs]}</span>
                                        <span style={{color:pc,fontWeight:500,marginLeft:'3px',fontSize:'10px'}}>{pct}%</span>
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
                  })}
                </div>
              )}
            </div>
          )}

          {/* FORECAST */}
          {tab==='forecast' && (
            <ForecastView a={parents.a} b={parents.b} />
          )}

          {/* GENE MAP */}
          {tab==='progress' && (
            <div>
              <div style={{background:C.card,border:'0.5px solid '+C.b,borderRadius:'10px',padding:'14px',marginBottom:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'10px'}}>Pool gene coverage</div>
                <CoverageMap allSpecs={allSpecs} />
              </div>
              <div style={{background:C.card,border:'0.5px solid '+C.b,borderRadius:'10px',padding:'14px'}}>
                <div style={{fontSize:'13px',fontWeight:500,marginBottom:'10px'}}>Missing genes</div>
                {(() => {
                  const mc=STAT_COORDS.filter(([c,info])=>info.t==='crit'&&(cov[c]||'D')==='D');
                  const ms=STAT_COORDS.filter(([c,info])=>info.t==='std'&&(cov[c]||'D')==='D');
                  if(!mc.length&&!ms.length) return <div style={{color:C.std,fontSize:'13px'}}>All tracked genes covered in pool.</div>;
                  return (
                    <>
                      {mc.length>0 && <div style={{marginBottom:'8px'}}>
                        <div style={{fontSize:'11px',color:C.crit,marginBottom:'5px',fontWeight:500}}>Critical missing ({mc.length})</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                          {mc.map(([c,info])=><span key={c} style={{fontFamily:'var(--font-mono)',fontSize:'11px',background:C.dangerBg,color:C.danger,padding:'2px 7px',borderRadius:'3px',border:'0.5px solid '+C.danger+'44'}}>{c} ({info.s})</span>)}
                        </div>
                      </div>}
                      {ms.length>0 && <div>
                        <div style={{fontSize:'11px',color:C.mu,marginBottom:'5px',fontWeight:500}}>Standard missing ({ms.length})</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'4px'}}>
                          {ms.map(([c,info])=><span key={c} style={{fontFamily:'var(--font-mono)',fontSize:'11px',background:'#180808',color:'#A05050',padding:'2px 7px',borderRadius:'3px'}}>{c} ({info.s})</span>)}
                        </div>
                      </div>}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* SPECIMENS */}
          {tab==='pool' && (
            <div>
              <div style={{marginBottom:'14px'}}>
                <div style={{fontSize:'12px',color:C.mu,marginBottom:'8px',fontWeight:500}}>Parents</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
                  {[['a','A'],['b','B']].map(([which,lbl]) => parents[which] && (
                    <div key={which} style={{background:C.card,border:'0.5px solid '+C.std,borderRadius:'9px',padding:'10px 12px'}}>
                      <div style={{fontSize:'11px',color:C.std,marginBottom:'3px'}}>Parent {lbl}</div>
                      <div style={{fontWeight:500,fontSize:'13px'}}>
                        <span style={{color:parents[which].gender==='male'?C.male:C.female,marginRight:'4px'}}>{parents[which].gender==='male'?'♂':'♀'}</span>
                        {parents[which].name}
                      </div>
                      <div style={{fontSize:'11px',color:C.mu,marginTop:'3px'}}>Score: {specimenScore(parents[which])}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{fontSize:'12px',color:C.mu,marginBottom:'8px',fontWeight:500}}>Offspring ({pool.length})</div>
              {pool.length===0
                ? <div style={{color:C.mu,fontSize:'13px'}}>No offspring yet. Use "+ Add offspring" above.</div>
                : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'8px'}}>
                    {rankedPool.map(s => {
                      const sc=specimenScore(s);
                      const cr=STAT_COORDS.filter(([c,info])=>info.t==='crit'&&(s.genome[c]||'D')==='R').length;
                      const mx=STAT_COORDS.filter(([c])=>(s.genome[c]||'D')==='x').length;
                      return (
                        <div key={s.id} style={{background:C.card,border:'0.5px solid '+C.b,borderRadius:'9px',padding:'10px 12px'}}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'7px'}}>
                            <div style={{minWidth:0,flex:1}}>
                              <div style={{fontWeight:500,fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                                <span style={{color:s.gender==='male'?C.male:C.female,marginRight:'4px'}}>{s.gender==='male'?'♂':'♀'}</span>
                                {s.name}
                              </div>
                              <div style={{fontSize:'10px',color:C.mu,marginTop:'2px'}}>F{s.gen||'?'}</div>
                            </div>
                            <button onClick={()=>removeSpecimen(s.id)} style={{border:'none',background:'none',cursor:'pointer',color:C.dim,fontSize:'16px',padding:'0',lineHeight:1,marginLeft:'4px',flexShrink:0}}>×</button>
                          </div>
                          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'4px',fontSize:'11px'}}>
                            {[['Score',sc,C.tx],['Crit 〇',cr,C.crit],['Mixed',mx,mx>10?C.danger:C.mu]].map(([lbl,val,col])=>(
                              <div key={lbl} style={{background:C.sf,borderRadius:'5px',padding:'4px',textAlign:'center'}}>
                                <div style={{fontSize:'14px',fontWeight:500,color:col}}>{val}</div>
                                <div style={{color:C.dim}}>{lbl}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
          )}
        </>
      )}
    </div>
  );
}

