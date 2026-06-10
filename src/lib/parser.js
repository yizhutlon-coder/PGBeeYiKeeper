// ── GENOME EXPORT PARSER ──────────────────────────────────────────────────────
// Parses the in-game export format:
//   [Overview]
//   Entity=SpecimenName
//   [Genes]
//   01= RDRD RDRR ...
// CR01–CR09 each have up to 10 groups (A–J), 4 positions each.

// Full parse of one export — pre-fills gender if the Entity name contains it,
// but the UI always confirms gender via dropdown before adding.
export function parseExport(text) {
  const lines = text.split('\n').map(l => l.trim());
  let name = 'Unknown', gender = 'unknown', genome = {};
  let inG = false;
  for (const line of lines) {
    if (line.startsWith('Entity=')) {
      const v = line.slice(7);
      gender = /female/i.test(v) ? 'female' : /male/i.test(v) ? 'male' : 'unknown';
      name = v.replace(/\b(male|female)\b/gi,'').replace(/\s+/g,' ').trim() || 'Unknown';
    }
    if (line === '[Genes]') { inG = true; continue; }
    if (line.startsWith('[') && line !== '[Genes]') { inG = false; continue; }
    if (inG && /^\d+=/.test(line)) {
      const cr = parseInt(line.split('=')[0]);
      line.split('=').slice(1).join('=').trim().replace(/\s+/g,' ').split(' ').filter(Boolean)
        .forEach((grp, gi) => {
          const gl = String.fromCharCode(65 + gi);
          for (let p = 0; p < grp.length; p++)
            genome[String(cr).padStart(2,'0') + gl + (p+1)] = grp[p];
        });
    }
  }
  return { name, gender, genome, id: Date.now() + '-' + Math.random().toString(36).slice(2,7) };
}

// Parse a paste containing one or more exports (splits on [Overview])
export function parseAll(text) {
  return text.split(/(?=\[Overview\])/i).filter(s => s.includes('[Genes]')).map(parseExport);
}

// Lightweight single-export parse — name + genome only (Planner)
export function parseGenome(text) {
  const genome = {};
  let inG = false, name = 'Unknown';
  for (const line of text.trim().split('\n').map(l => l.trim())) {
    if (line.startsWith('Entity=')) name = line.slice(7).replace(/\b(male|female)\b/gi,'').trim() || 'Unknown';
    if (line === '[Genes]') { inG = true; continue; }
    if (line.startsWith('[') && line !== '[Genes]') { inG = false; continue; }
    if (inG && /^\d+=/.test(line)) {
      const cr = parseInt(line.split('=')[0]);
      line.split('=').slice(1).join('=').trim().replace(/\s+/g,' ').split(' ').filter(Boolean)
        .forEach((grp, gi) => {
          const gl = String.fromCharCode(65+gi);
          for (let p = 0; p < grp.length; p++)
            genome[`${String(cr).padStart(2,'0')}${gl}${p+1}`] = grp[p];
        });
    }
  }
  return { name, genome };
}
