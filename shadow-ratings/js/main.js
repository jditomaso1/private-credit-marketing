// Map files by framework (keys = filenames in /frameworks/<fw>/, values = UI labels)
const INDUSTRY_MANIFEST = {
  sp: {
    'media': 'Media',
    'retail-restaurants': 'Retail & Restaurants',
    // 'airlines': 'Airlines', // add as you create files
  },
  moodys: {
    'manufacturing': 'Manufacturing',
    'diversified-technology': 'Diversified Technology',
    'communications-infrastructure': 'Communications Infrastructure',
    'steel': 'Steel',
    'gaming': 'Gaming',
    'restaurants': 'Restaurants',
    'retail-and-apparel': 'Retail & Apparel',
    'shipping': 'Shipping',
    'alcoholic-beverages': 'Alcoholic Beverages',
    'building-materials': 'Building Materials',
    'pharmaceuticals': 'Pharmaceuticals',
    'manufacturing2': 'M2-Test',
  },
};

function populateIndustryOptions(fw){
  const sel = document.getElementById('industry');
  const current = sel.value;
  const entries = Object.entries(INDUSTRY_MANIFEST[fw] || {});
  sel.innerHTML = entries.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');
  if (INDUSTRY_MANIFEST[fw] && INDUSTRY_MANIFEST[fw][current]) sel.value = current;
}

// === dynamic loader ===
async function loadModule() {
  const fw = document.getElementById('framework').value;   // 'moodys' | 'sp'
  const ind = document.getElementById('industry').value;   // filename (no .js)
  return await import(`../frameworks/${fw}/${ind}.js`);
}

function fieldRow(f){
  if (f.type === 'select'){
    const opts = f.options?.map(o=>`<option>${o}</option>`).join('') ?? '';
    return `<div class="row"><label for="${f.id}">${f.label}</label><select id="${f.id}">${opts}</select></div>`;
  }
  const step = f.step || '0.01';
  const type = f.type || 'number';
  const ph   = f.placeholder || '';
  return `<div class="row"><label for="${f.id}">${f.label}</label><input id="${f.id}" type="${type}" step="${step}" placeholder="${ph}"></div>`;
}

function buildForm(fields){
  document.getElementById('inputs').innerHTML = fields.map(fieldRow).join('');
}

function fmt(v){
  if (v === Infinity) return 'N/A';
  if (!Number.isFinite(v)) return '—';
  const n = Number(v);
  return Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2);
}

async function calculate(){
  const mod = await loadModule();

  // Collect inputs exactly as defined in the module (preserves all your fields)
  const inputs = {};
  for (const f of mod.fields){
    const el = document.getElementById(f.id);
    // safer: blank -> null instead of NaN
    inputs[f.id] = (f.type === 'select') ? el.value : (el.value === '' ? null : parseFloat(el.value));
  }

  const res = await mod.score(inputs);

  // Render
  document.getElementById('finalRating').textContent = res.rating || '—';
  document.getElementById('numeric').textContent = `Score: ${Number.isFinite(res.numeric) ? res.numeric.toFixed(2) : '—'}`;
  if (res.pdHint) {
    const base = Number.isFinite(res.numeric) ? res.numeric.toFixed(2) : '—';
    document.getElementById('explain').textContent = `Base score ${base}/100. ${res.pdHint}`;
  } else {
    document.getElementById('explain').textContent = 'Calculation complete using the active template.';
  }
  const tbody = document.querySelector('#metricsTable tbody');
  tbody.innerHTML = Object.entries(res.metrics || {}).map(([k,v]) =>
    `<tr><td>${k}</td><td>${fmt(v)}</td></tr>`
  ).join('');

  document.getElementById('drivers').innerHTML = (res.drivers || []).map(d => `<li>${d}</li>`).join('');
}

document.getElementById('calcBtn').addEventListener('click', calculate);

// Rebuild industries for the chosen framework, then load that module's fields
async function refreshForm(){
  const fw = document.getElementById('framework').value;
  populateIndustryOptions(fw);                 // <-- add this
  const m = await loadModule();
  buildForm(m.fields);
}
document.getElementById('framework').addEventListener('change', refreshForm);
document.getElementById('industry').addEventListener('change', refreshForm);

// Initial load: populate industries for default framework, then render
populateIndustryOptions(document.getElementById('framework').value);  // <-- add this
refreshForm();
