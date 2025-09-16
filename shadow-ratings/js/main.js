// Builds the styled left-hand form from the active module's `fields`
// and renders results from its `score(inputs)` output.

async function loadModule() {
  const fw = document.getElementById('framework').value;   // 'moodys' | 'sp'
  const ind = document.getElementById('industry').value;   // 'media', etc.
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
    inputs[f.id] = (f.type === 'select') ? el.value : parseFloat(el.value);
  }

  // Compute result via the module's own scoring function
  const res = await mod.score(inputs);

  // Render
  document.getElementById('finalRating').textContent = res.rating || '—';
  document.getElementById('numeric').textContent = `Score: ${Number.isFinite(res.numeric) ? res.numeric.toFixed(2) : '—'}`;
  document.getElementById('explain').textContent = 'Calculation complete using the active template.';

  // Metrics table (expects keys like Revenue, Leverage, Coverage)
  const tbody = document.querySelector('#metricsTable tbody');
  tbody.innerHTML = Object.entries(res.metrics || {}).map(([k,v]) =>
    `<tr><td>${k}</td><td>${fmt(v)}</td></tr>`
  ).join('');

  // Drivers
  document.getElementById('drivers').innerHTML = (res.drivers || []).map(d => `<li>${d}</li>`).join('');
}

document.getElementById('calcBtn').addEventListener('click', calculate);

// When framework / industry changes, rebuild the form from that module's fields
async function refreshForm(){ const m = await loadModule(); buildForm(m.fields); }
document.getElementById('framework').addEventListener('change', refreshForm);
document.getElementById('industry').addEventListener('change', refreshForm);

// Initial load
refreshForm();
