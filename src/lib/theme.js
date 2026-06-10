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
