// ── SHARED DARK THEME ─────────────────────────────────────────────────────────
// Union of the per-tool theme objects from the standalone versions.
export const C = {
  bg:'#0D0F18', sf:'#13172A', card:'#1A1E2F', b:'#252B42',
  tx:'#DCE4F8', mu:'#6B739E', dim:'#2E344F',
  crit:'#F59E0B', critBg:'#1A1200',
  std:'#34D399', stdBg:'#031410',
  floor:'#60A5FA', floorBg:'#030C22',
  gem:'#C084FC', gemBg:'#100820',
  mixed:'#F472B6', mixedBg:'#1A0A14',
  safe:'#34D399', safeBg:'#031410',
  caution:'#FCD34D', cautionBg:'#1A1000',
  danger:'#F87171', dangerBg:'#180505',
  male:'#60A5FA', female:'#F472B6',
};

// Color for a gene state symbol (R/x/D)
export const symCol = v => v==='R' ? C.std : v==='x' ? C.caution : C.dim;

// Distinct hue per stat type — so a gene's stat reads at a glance.
const STAT_COL = {
  T:'#FB923C',   // Toughness — orange
  Fe:'#F87171',  // Ferocity — red
  Fr:'#38BDF8',  // Frost — sky blue
  Ru:'#C084FC',  // Runic — purple
  En:'#FACC15',  // Energy — yellow
  V:'#4ADE80',   // Versatility — green
  I:'#2DD4BF',   // Insight — teal
};
export const statCol = s => STAT_COL[s] || C.mu;

// Color scaled by stat value (1–10) — higher reads brighter/greener.
export const valCol = v =>
  v >= 9 ? '#22D3EE' :   // top
  v >= 7 ? '#34D399' :   // high
  v >= 5 ? '#A3E635' :   // good
  v >= 3 ? '#FCD34D' :   // mid
  v >= 1 ? '#9AA0B8' :   // low
           C.mu;
