// ── STAT GENE MAP — single source of truth ────────────────────────────────────
// Based on pre-patch research by Azizah & Deldaron. ~6 genes may have higher
// values post-patch but positions are unconfirmed — more recessive = better.
// s: stat (T/Fe/Fr/Ru/En/V/I, '?' = unconfirmed)
// t: 'std'=standard | 'crit'=CR6-8+CR9AB rare | 'floor'=always R | 'orange'=always D | 'gem'=mutated orange
// v: stat value (0 = unknown)
export const SG = {
  // CR01
  '01A2':{s:'T',t:'std',v:2},
  '01B1':{s:'Fr',t:'std',v:3},'01B2':{s:'Ru',t:'std',v:5},'01B3':{s:'Fe',t:'std',v:5},
  '01C1':{s:'En',t:'std',v:4},'01C2':{s:'V',t:'std',v:3},
  '01D1':{s:'T',t:'std',v:3},'01D3':{s:'Fr',t:'floor',v:0},
  '01E2':{s:'I',t:'std',v:3},'01E3':{s:'En',t:'std',v:5},
  '01F1':{s:'I',t:'std',v:4},'01F3':{s:'V',t:'std',v:3},'01F4':{s:'Ru',t:'std',v:5},
  '01G1':{s:'En',t:'std',v:5},'01G2':{s:'T',t:'std',v:6},'01G3':{s:'V',t:'orange',v:0},
  '01H1':{s:'Fr',t:'std',v:5},'01H3':{s:'Fe',t:'std',v:3},'01H4':{s:'Ru',t:'std',v:3},
  '01I1':{s:'Fe',t:'orange',v:0},
  '01J1':{s:'V',t:'std',v:5},'01J2':{s:'I',t:'std',v:3},
  // CR02
  '02A1':{s:'T',t:'std',v:2},'02A3':{s:'Ru',t:'std',v:5},
  '02B2':{s:'I',t:'std',v:6},'02B3':{s:'Fe',t:'std',v:3},'02B4':{s:'Fr',t:'std',v:2},
  '02C1':{s:'V',t:'std',v:2},'02C3':{s:'En',t:'std',v:7},'02C4':{s:'Ru',t:'std',v:5},
  '02D2':{s:'En',t:'std',v:3},'02D3':{s:'T',t:'std',v:4},
  '02E1':{s:'Fe',t:'std',v:5},'02E2':{s:'I',t:'orange',v:0},'02E4':{s:'I',t:'std',v:5},
  // CR03
  '03A1':{s:'V',t:'std',v:6},'03A4':{s:'Fe',t:'floor',v:0},
  '03B3':{s:'Fe',t:'floor',v:0},'03B4':{s:'T',t:'floor',v:0},
  '03C1':{s:'Ru',t:'std',v:6},'03C2':{s:'En',t:'std',v:1},
  '03D1':{s:'Fr',t:'floor',v:0},'03D3':{s:'Fe',t:'floor',v:0},
  '03E1':{s:'T',t:'std',v:3},'03E3':{s:'I',t:'std',v:4},'03E4':{s:'Ru',t:'std',v:4},
  '03F2':{s:'T',t:'std',v:5},'03F3':{s:'Ru',t:'orange',v:0},
  '03G1':{s:'Fe',t:'std',v:2},'03G2':{s:'V',t:'std',v:4},'03G3':{s:'?',t:'orange',v:0},
  '03H2':{s:'Fr',t:'std',v:4},'03H3':{s:'Fr',t:'std',v:3},
  '03I2':{s:'V',t:'orange',v:0},'03I4':{s:'I',t:'orange',v:0},
  '03J1':{s:'Fe',t:'std',v:3},'03J4':{s:'I',t:'std',v:7},
  // CR04
  '04A1':{s:'V',t:'orange',v:0},
  '04B1':{s:'T',t:'std',v:2},'04B2':{s:'Fr',t:'floor',v:0},'04B3':{s:'Fe',t:'std',v:4},
  '04C1':{s:'I',t:'std',v:4},'04C2':{s:'V',t:'std',v:4},'04C3':{s:'Ru',t:'std',v:5},
  '04D1':{s:'Ru',t:'floor',v:0},'04D2':{s:'En',t:'floor',v:0},'04D3':{s:'En',t:'std',v:4},
  '04E1':{s:'I',t:'std',v:2},'04E2':{s:'I',t:'orange',v:0},'04E3':{s:'Fe',t:'orange',v:0},
  // CR05
  '05A2':{s:'Fr',t:'std',v:4},'05A4':{s:'En',t:'std',v:4},
  '05B1':{s:'I',t:'std',v:4},'05B2':{s:'I',t:'std',v:2},'05B3':{s:'Fr',t:'std',v:3},'05B4':{s:'Fe',t:'std',v:1},
  '05C2':{s:'T',t:'std',v:7},
  // CR06
  '06A1':{s:'T',t:'crit',v:9},'06A2':{s:'V',t:'std',v:7},'06A3':{s:'Fe',t:'crit',v:5},
  '06B1':{s:'Ru',t:'crit',v:2},'06B2':{s:'Fr',t:'crit',v:5},'06B3':{s:'Fe',t:'crit',v:5},'06B4':{s:'T',t:'crit',v:2},
  '06C2':{s:'Ru',t:'crit',v:7},
  // CR07
  '07A1':{s:'I',t:'crit',v:6},'07A3':{s:'Ru',t:'crit',v:3},
  '07B1':{s:'En',t:'crit',v:2},'07B2':{s:'T',t:'crit',v:2},'07B4':{s:'En',t:'crit',v:7},
  '07C1':{s:'Ru',t:'crit',v:4},'07C2':{s:'Fr',t:'crit',v:7},'07C3':{s:'V',t:'crit',v:2},
  '07D1':{s:'T',t:'crit',v:5},'07D2':{s:'Fe',t:'crit',v:6},'07D4':{s:'I',t:'crit',v:5},
  '07E1':{s:'Fr',t:'crit',v:5},'07E2':{s:'Ru',t:'crit',v:3},'07E3':{s:'En',t:'crit',v:5},'07E4':{s:'Fr',t:'crit',v:3},
  '07F2':{s:'En',t:'crit',v:3},'07F3':{s:'Fr',t:'crit',v:3},
  '07G1':{s:'Ru',t:'crit',v:6},'07G2':{s:'I',t:'crit',v:5},'07G3':{s:'V',t:'crit',v:2},'07G4':{s:'Fr',t:'crit',v:4},
  '07H1':{s:'T',t:'crit',v:3},'07H2':{s:'En',t:'crit',v:6},'07H3':{s:'V',t:'crit',v:6},
  '07I1':{s:'Fe',t:'crit',v:3},'07I2':{s:'En',t:'crit',v:2},'07I4':{s:'T',t:'crit',v:4},
  '07J1':{s:'Ru',t:'crit',v:9},'07J2':{s:'Fr',t:'crit',v:1},'07J3':{s:'Ru',t:'crit',v:3},'07J4':{s:'T',t:'crit',v:4},
  // CR08
  '08A2':{s:'T',t:'crit',v:7},'08A4':{s:'I',t:'crit',v:2},
  '08B1':{s:'V',t:'crit',v:3},'08B2':{s:'Fe',t:'crit',v:7},'08B3':{s:'V',t:'crit',v:3},
  '08C2':{s:'En',t:'crit',v:4},'08C4':{s:'Fr',t:'crit',v:6},
  '08E1':{s:'I',t:'crit',v:3},
  '08F2':{s:'Ru',t:'crit',v:1},
  // CR09
  '09A1':{s:'T',t:'crit',v:2},'09A3':{s:'T',t:'crit',v:2},'09A4':{s:'T',t:'crit',v:2},
  '09B2':{s:'Fe',t:'crit',v:4},'09B3':{s:'Fe',t:'crit',v:1},'09B4':{s:'En',t:'crit',v:4},
  '09C2':{s:'Fr',t:'std',v:7},
  '09D1':{s:'Fr',t:'std',v:2},'09D2':{s:'Ru',t:'std',v:4},'09D4':{s:'En',t:'std',v:3},
  '09E1':{s:'I',t:'std',v:5},'09E4':{s:'V',t:'std',v:5},
};

// Tier weights for scoring
export const W = { gem:10, crit:5, std:1, orange:7, floor:0 };

// Gene state display symbols
export const SYM = { R:'〇', D:'⬤', x:'⦿', '?':'?' };

// Chromosome / group layout
export const CRS = ['01','02','03','04','05','06','07','08','09'];
export const GROUPS = ['A','B','C','D','E','F','G','H','I','J'];

// Stat genes that actually need breeding work (excludes floor + orange tiers)
export const STAT_COORDS = Object.entries(SG).filter(([, i]) => i.t !== 'floor' && i.t !== 'orange');
