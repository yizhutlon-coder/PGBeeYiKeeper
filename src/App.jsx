import { useState } from 'react';
import { C } from './lib/theme.js';
import Calculator from './Calculator.jsx';
import Planner from './Planner.jsx';
import BackupControls from './components/BackupControls.jsx';

const TOOLS = [
  { id: 'calculator', label: 'Calculator', desc: 'Stable manager & pairings', Comp: Calculator },
  { id: 'planner', label: 'Sib-Cross Planner', desc: 'Multi-project breeding tracker, with forecast', Comp: Planner },
];

const NAV_KEY = 'pg-active-tool';

export default function App() {
  const [active, setActive] = useState(() => {
    try {
      const saved = localStorage.getItem(NAV_KEY);
      return TOOLS.some(t => t.id === saved) ? saved : 'calculator';
    } catch { return 'calculator'; }
  });

  function switchTool(id) {
    setActive(id);
    try { localStorage.setItem(NAV_KEY, id); } catch {}
  }

  const tool = TOOLS.find(t => t.id === active) || TOOLS[0];
  const ToolComp = tool.Comp;

  return (
    <div>
      <div style={{ display:'flex', alignItems:'baseline', gap:'10px', flexWrap:'wrap', marginBottom:'10px' }}>
        <span style={{ fontSize:'18px', fontWeight:600, color:C.crit, whiteSpace:'nowrap' }}>🐝 PGBeeYiKeeper</span>
        <span style={{ fontSize:'12px', color:C.mu }}>Tool to help you create the perfect Combat Bee in Project Gorgon</span>
      </div>
      <nav style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px', flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'4px', flexWrap:'wrap', flex:1, minWidth:0 }}>
          {TOOLS.map(t => {
            const isActive = t.id === active;
            return (
              <button key={t.id} onClick={() => switchTool(t.id)} title={t.desc}
                style={{
                  padding:'7px 14px', fontSize:'13px', cursor:'pointer', borderRadius:'7px',
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? C.card : 'transparent',
                  color: isActive ? C.tx : C.mu,
                  border: '0.5px solid ' + (isActive ? C.crit : 'transparent'),
                  whiteSpace:'nowrap', transition:'color 0.1s, background 0.1s',
                }}>
                {t.label}
              </button>
            );
          })}
        </div>
        <BackupControls />
      </nav>
      <ToolComp />
    </div>
  );
}
