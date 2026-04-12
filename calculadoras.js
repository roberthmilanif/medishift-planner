/* MediShift Planner - Módulo de Calculadoras Clínicas */

// ─── SOFA ───────────────────────────────────────────────────────────────────

const SOFA_MORTALITY = [
  { max: 1,  label: '< 10%',   color: 'success' },
  { max: 5,  label: '15–20%',  color: 'success' },
  { max: 9,  label: '40–50%',  color: 'warning' },
  { max: 12, label: '50–60%',  color: 'warning' },
  { max: 14, label: '> 80%',   color: 'danger'  },
  { max: 24, label: '> 90%',   color: 'danger'  },
];

const SOFA_CRITERIA = {
  resp: {
    label: 'Respiratório (PaO₂/FiO₂)',
    options: [
      { value: 0, label: '≥ 400' },
      { value: 1, label: '300–399' },
      { value: 2, label: '200–299' },
      { value: 3, label: '100–199 (com suporte ventilatório)' },
      { value: 4, label: '< 100 (com suporte ventilatório)' },
    ],
  },
  coag: {
    label: 'Coagulação (Plaquetas × 10³/µL)',
    options: [
      { value: 0, label: '≥ 150' },
      { value: 1, label: '100–149' },
      { value: 2, label: '50–99' },
      { value: 3, label: '20–49' },
      { value: 4, label: '< 20' },
    ],
  },
  figado: {
    label: 'Fígado (Bilirrubina mg/dL)',
    options: [
      { value: 0, label: '< 1,2' },
      { value: 1, label: '1,2–1,9' },
      { value: 2, label: '2,0–5,9' },
      { value: 3, label: '6,0–11,9' },
      { value: 4, label: '≥ 12,0' },
    ],
  },
  cardio: {
    label: 'Cardiovascular (PAM / Vasopressores)',
    options: [
      { value: 0, label: 'PAM ≥ 70 mmHg' },
      { value: 1, label: 'PAM < 70 mmHg' },
      { value: 2, label: 'Dopamina ≤ 5 ou Dobutamina (qualquer dose)' },
      { value: 3, label: 'Dopamina > 5 ou Adrenalina/Noradrenalina ≤ 0,1' },
      { value: 4, label: 'Dopamina > 15 ou Adrenalina/Noradrenalina > 0,1' },
    ],
  },
  snc: {
    label: 'SNC (Glasgow)',
    options: [
      { value: 0, label: '15' },
      { value: 1, label: '13–14' },
      { value: 2, label: '10–12' },
      { value: 3, label: '6–9' },
      { value: 4, label: '< 6' },
    ],
  },
  renal: {
    label: 'Renal (Creatinina mg/dL ou Diurese)',
    options: [
      { value: 0, label: '< 1,2' },
      { value: 1, label: '1,2–1,9' },
      { value: 2, label: '2,0–3,4' },
      { value: 3, label: '3,5–4,9 ou diurese < 500 mL/dia' },
      { value: 4, label: '> 5,0 ou diurese < 200 mL/dia' },
    ],
  },
};

function buildSOFA() {
  const container = document.getElementById('calc-sofa');
  if (!container) return;

  let html = '<div class="calc-form">';

  for (const [key, sys] of Object.entries(SOFA_CRITERIA)) {
    html += `
      <div class="calc-field">
        <label>${sys.label}</label>
        <select id="sofa-${key}" onchange="calcSOFA()">
          ${sys.options.map(o => `<option value="${o.value}">${o.value} – ${o.label}</option>`).join('')}
        </select>
      </div>`;
  }

  html += `</div>
    <div class="calc-result" id="sofa-result">
      <div class="result-score">
        <span class="score-value" id="sofa-total">0</span>
        <span class="score-label">/ 24 pts</span>
      </div>
      <div class="result-detail" id="sofa-detail">Selecione os parâmetros acima</div>
    </div>`;

  container.innerHTML = html;
  calcSOFA();
}

function calcSOFA() {
  const keys = Object.keys(SOFA_CRITERIA);
  let total = 0;
  for (const k of keys) {
    const el = document.getElementById(`sofa-${k}`);
    if (el) total += parseInt(el.value, 10);
  }

  document.getElementById('sofa-total').textContent = total;

  const mort = SOFA_MORTALITY.find(m => total <= m.max) || SOFA_MORTALITY[SOFA_MORTALITY.length - 1];
  const detail = document.getElementById('sofa-detail');
  detail.innerHTML = `
    <span class="badge badge-${mort.color}">Mortalidade estimada: ${mort.label}</span>`;
}

// ─── COCKROFT-GAULT ──────────────────────────────────────────────────────────

const CKD_STAGES = [
  { min: 90,  label: 'G1 – Normal ou aumentada',       color: 'success' },
  { min: 60,  label: 'G2 – Levemente reduzida',         color: 'success' },
  { min: 45,  label: 'G3a – Leve a moderadamente reduzida', color: 'warning' },
  { min: 30,  label: 'G3b – Moderada a gravemente reduzida', color: 'warning' },
  { min: 15,  label: 'G4 – Gravemente reduzida',        color: 'danger'  },
  { min: 0,   label: 'G5 – Falência renal',             color: 'danger'  },
];

function buildCG() {
  const container = document.getElementById('calc-cg');
  if (!container) return;

  container.innerHTML = `
    <div class="calc-form">
      <div class="form-row">
        <div class="calc-field">
          <label>Idade (anos)</label>
          <input type="number" id="cg-age" min="1" max="120" placeholder="Ex: 65" oninput="calcCG()">
        </div>
        <div class="calc-field">
          <label>Peso (kg)</label>
          <input type="number" id="cg-weight" min="1" max="300" placeholder="Ex: 70" oninput="calcCG()">
        </div>
      </div>
      <div class="form-row">
        <div class="calc-field">
          <label>Creatinina sérica (mg/dL)</label>
          <input type="number" id="cg-cr" min="0.1" step="0.1" placeholder="Ex: 1.0" oninput="calcCG()">
        </div>
        <div class="calc-field">
          <label>Sexo</label>
          <select id="cg-sex" onchange="calcCG()">
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>
      </div>
    </div>
    <div class="calc-result" id="cg-result">
      <div class="result-score">
        <span class="score-value" id="cg-total">–</span>
        <span class="score-label">mL/min</span>
      </div>
      <div class="result-detail" id="cg-detail">Preencha os campos acima</div>
    </div>`;

  calcCG();
}

function calcCG() {
  const age    = parseFloat(document.getElementById('cg-age')?.value);
  const weight = parseFloat(document.getElementById('cg-weight')?.value);
  const cr     = parseFloat(document.getElementById('cg-cr')?.value);
  const sex    = document.getElementById('cg-sex')?.value;

  if (!age || !weight || !cr || cr === 0) {
    document.getElementById('cg-total').textContent = '–';
    document.getElementById('cg-detail').innerHTML  = 'Preencha os campos acima';
    return;
  }

  let clcr = ((140 - age) * weight) / (72 * cr);
  if (sex === 'F') clcr *= 0.85;
  clcr = Math.max(0, clcr);

  document.getElementById('cg-total').textContent = clcr.toFixed(1);

  const stage = CKD_STAGES.find(s => clcr >= s.min) || CKD_STAGES[CKD_STAGES.length - 1];
  document.getElementById('cg-detail').innerHTML =
    `<span class="badge badge-${stage.color}">DRC ${stage.label}</span>`;
}

// ─── GLASGOW ─────────────────────────────────────────────────────────────────

const GLASGOW_COMPONENTS = {
  ocular: {
    label: 'Abertura Ocular',
    icon:  'fa-eye',
    options: [
      { value: 4, label: 'Espontânea' },
      { value: 3, label: 'À voz' },
      { value: 2, label: 'À dor' },
      { value: 1, label: 'Ausente' },
    ],
  },
  verbal: {
    label: 'Resposta Verbal',
    icon:  'fa-comment',
    options: [
      { value: 5, label: 'Orientado' },
      { value: 4, label: 'Confuso' },
      { value: 3, label: 'Palavras inapropriadas' },
      { value: 2, label: 'Sons incompreensíveis' },
      { value: 1, label: 'Ausente' },
    ],
  },
  motor: {
    label: 'Resposta Motora',
    icon:  'fa-hand-paper',
    options: [
      { value: 6, label: 'Obedece comandos' },
      { value: 5, label: 'Localiza a dor' },
      { value: 4, label: 'Retirada à dor' },
      { value: 3, label: 'Flexão anormal (decorticação)' },
      { value: 2, label: 'Extensão anormal (descerebração)' },
      { value: 1, label: 'Ausente' },
    ],
  },
};

function glasgowClass(total) {
  if (total >= 13) return { label: 'Leve (13–15)',    color: 'success' };
  if (total >= 9)  return { label: 'Moderado (9–12)', color: 'warning' };
  return               { label: 'Grave (3–8)',         color: 'danger'  };
}

function buildGlasgow() {
  const container = document.getElementById('calc-glasgow');
  if (!container) return;

  let html = '<div class="calc-form glasgow-grid">';

  for (const [key, comp] of Object.entries(GLASGOW_COMPONENTS)) {
    html += `
      <div class="glasgow-component">
        <div class="glasgow-comp-header">
          <i class="fas ${comp.icon}"></i>
          <span>${comp.label}</span>
        </div>
        <div class="glasgow-options">
          ${comp.options.map(o => `
            <label class="glasgow-option">
              <input type="radio" name="gcs-${key}" value="${o.value}"
                ${o.value === comp.options[comp.options.length - 1].value ? 'checked' : ''}
                onchange="calcGlasgow()">
              <span class="glasgow-score">${o.value}</span>
              <span class="glasgow-desc">${o.label}</span>
            </label>`).join('')}
        </div>
      </div>`;
  }

  html += `</div>
    <div class="calc-result" id="glasgow-result">
      <div class="result-score">
        <span class="score-value" id="glasgow-total">3</span>
        <span class="score-label">/ 15 pts</span>
      </div>
      <div class="result-detail" id="glasgow-detail"></div>
    </div>`;

  container.innerHTML = html;
  calcGlasgow();
}

function calcGlasgow() {
  let total = 0;
  for (const key of Object.keys(GLASGOW_COMPONENTS)) {
    const checked = document.querySelector(`input[name="gcs-${key}"]:checked`);
    if (checked) total += parseInt(checked.value, 10);
  }

  document.getElementById('glasgow-total').textContent = total;
  const cls = glasgowClass(total);
  document.getElementById('glasgow-detail').innerHTML =
    `<span class="badge badge-${cls.color}">TCE ${cls.label}</span>`;
}

// ─── RASS ────────────────────────────────────────────────────────────────────

const RASS_LEVELS = [
  { value:  4, label: 'Combativo',          desc: 'Violento, perigo imediato para a equipe', color: 'danger'  },
  { value:  3, label: 'Muito agitado',       desc: 'Puxa ou remove tubos/cateteres; agressivo', color: 'danger' },
  { value:  2, label: 'Agitado',             desc: 'Movimentos frequentes sem propósito; combate ao ventilador', color: 'warning' },
  { value:  1, label: 'Inquieto',            desc: 'Ansioso mas movimentos não agressivos', color: 'warning' },
  { value:  0, label: 'Alerta e calmo',      desc: 'Estado ideal', color: 'success' },
  { value: -1, label: 'Sonolento',           desc: 'Não totalmente alerta; acorda a voz (> 10 s)', color: 'success' },
  { value: -2, label: 'Sedação leve',        desc: 'Desperta brevemente à voz (< 10 s)', color: 'success' },
  { value: -3, label: 'Sedação moderada',    desc: 'Movimento ou abertura ocular à voz (sem contato visual)', color: 'warning' },
  { value: -4, label: 'Sedação profunda',    desc: 'Sem resposta à voz; movimento à estimulação física', color: 'danger' },
  { value: -5, label: 'Não estimulável',     desc: 'Sem resposta à voz ou estimulação física', color: 'danger' },
];

function buildRASS() {
  const container = document.getElementById('calc-rass');
  if (!container) return;

  const optionsHTML = RASS_LEVELS.map(l => `
    <option value="${l.value}">${l.value > 0 ? '+' : ''}${l.value} – ${l.label}</option>
  `).join('');

  container.innerHTML = `
    <div class="calc-form">
      <div class="calc-field">
        <label>Nível de sedação/agitação</label>
        <select id="rass-value" onchange="calcRASS()">
          ${optionsHTML}
        </select>
      </div>
    </div>
    <div class="calc-result" id="rass-result">
      <div class="result-score">
        <span class="score-value" id="rass-score">–</span>
        <span class="score-label" id="rass-label-text"></span>
      </div>
      <div class="result-detail" id="rass-detail"></div>
    </div>
    <div class="rass-scale">
      ${RASS_LEVELS.map(l => `
        <div class="rass-row rass-${l.color}" id="rass-row-${l.value}" onclick="selectRASS(${l.value})">
          <span class="rass-val">${l.value > 0 ? '+' : ''}${l.value}</span>
          <span class="rass-name">${l.label}</span>
          <span class="rass-desc">${l.desc}</span>
        </div>`).join('')}
    </div>`;

  // Default: alerta e calmo (0)
  document.getElementById('rass-value').value = '0';
  calcRASS();
}

function selectRASS(value) {
  const sel = document.getElementById('rass-value');
  if (sel) { sel.value = String(value); calcRASS(); }
}

function calcRASS() {
  const val   = parseInt(document.getElementById('rass-value')?.value ?? '0', 10);
  const level = RASS_LEVELS.find(l => l.value === val);

  document.getElementById('rass-score').textContent     = val > 0 ? `+${val}` : val;
  document.getElementById('rass-label-text').textContent = level ? level.label : '';
  document.getElementById('rass-detail').innerHTML = level
    ? `<span class="badge badge-${level.color}">${level.desc}</span>` : '';

  // Highlight active row
  document.querySelectorAll('.rass-row').forEach(row => row.classList.remove('rass-active'));
  const activeRow = document.getElementById(`rass-row-${val}`);
  if (activeRow) activeRow.classList.add('rass-active');
}

// ─── TAB NAVIGATION ──────────────────────────────────────────────────────────

function initCalcs() {
  const tabBtns  = document.querySelectorAll('.calc-tab-btn');
  const calcPanes = document.querySelectorAll('.calc-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      calcPanes.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = document.getElementById('calc-pane-' + btn.dataset.calc);
      if (target) target.classList.add('active');
    });
  });

  buildSOFA();
  buildCG();
  buildGlasgow();
  buildRASS();
}

document.addEventListener('DOMContentLoaded', initCalcs);
