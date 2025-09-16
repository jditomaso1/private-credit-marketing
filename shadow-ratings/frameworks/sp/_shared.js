// frameworks/sp/_shared.js
// Local S&P mapping for aggregate 0–100 → letter.
// Tune these thresholds per your calibration.
export const SP_BANDS = [
  { min: 88, letter: 'BB+' },
  { min: 82, letter: 'BB'  },
  { min: 77, letter: 'BB-' },
  { min: 72, letter: 'B+'  },
  { min: 66, letter: 'B'   },
  { min: 60, letter: 'B-'  },
  { min: 52, letter: 'CCC+'},
  { min: 42, letter: 'CCC' },
  { min:  0, letter: 'CCC-'},
];

export function spMapScoreToLetter(score){
  const s = Number.isFinite(score) ? score : 0;
  const band = SP_BANDS.find(b => s >= b.min);
  return band ? band.letter : 'CCC-';
}

// Optional: PD hint tuned for S&P mapping
export function spPDHint(letter){
  const map = {
    'BB+':'≈1–2% PD','BB':'≈2–3%','BB-':'≈3–4%',
    'B+':'≈4–6%','B':'≈6–9%','B-':'≈9–14%',
    'CCC+':'≈14–22%','CCC':'≈22–30%','CCC-':'≈30%+'
  };
  return map[letter] || '—';
}
