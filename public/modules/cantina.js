import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let _db;

export async function init(container, db) {
  _db = db;
  container.innerHTML = `
    <div class="header-row">
      <div>
        <div class="page-title">🏛 Cantina</div>
        <div class="page-subtitle">Gestione lotti di vinificazione e vasche</div>
      </div>
      <div class="module-actions" id="cantina-actions"></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="lotti">Lotti</button>
      <button class="tab-btn" data-tab="vasche">Vasche</button>
    </div>
    <div id="tab-lotti" class="tab-content active"></div>
    <div id="tab-vasche" class="tab-content"></div>
  `;

  // Tab switching
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
      updateActions(btn.dataset.tab);
    });
  });

  await Promise.all([loadLotti(), loadVasche()]);
  updateActions('lotti');
}

function updateActions(tab) {
  const actDiv = document.getElementById('cantina-actions');
  if (tab === 'lotti') {
    actDiv.innerHTML = `<button class="btn btn-primary" id="btn-add-lotto">＋ Nuovo Lotto</button>`;
    document.getElementById('btn-add-lotto').addEventListener('click', openAddLottoModal);
  } else {
    actDiv.innerHTML = `<button class="btn btn-primary" id="btn-add-vasca">＋ Nuova Vasca</button>`;
    document.getElementById('btn-add-vasca').addEventListener('click', openAddVascaModal);
  }
}

// ── Lotti ─────────────────────────────────
const statoLottoConfig = {
  fermentazione: { badge: 'badge-amber', label: 'Fermentazione' },
  affinamento:   { badge: 'badge-blue',  label: 'Affinamento' },
  pronto:        { badge: 'badge-green', label: 'Pronto' },
  imbottigliato: { badge: 'badge-grey',  label: 'Imbottigliato' },
};

async function loadLotti() {
  const tab = document.getElementById('tab-lotti');
  tab.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'cantina_lotti'), orderBy('dataInizio', 'desc')));
    const lotti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!lotti.length) {
      tab.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">🍾</span><strong>Nessun lotto</strong><p>Aggiungi il primo lotto di vinificazione.</p></div></div>';
      return;
    }

    tab.innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nome Lotto</th>
                <th>Vitigno</th>
                <th>Annata</th>
                <th>Litri</th>
                <th>Vasca</th>
                <th>Stato</th>
                <th>Inizio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${lotti.map(l => renderLottoRow(l)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tab.querySelectorAll('.btn-edit-lotto').forEach(btn => {
      btn.addEventListener('click', () => openEditLottoModal(lotti.find(l => l.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-lotto').forEach(btn => {
      btn.addEventListener('click', () => deleteLotto(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="card"><div class="empty-state"><span class="empty-icon">⚠️</span>${err.message}</div></div>`;
  }
}

function renderLottoRow(l) {
  const cfg = statoLottoConfig[l.stato] || { badge: 'badge-grey', label: l.stato };
  const dateStr = l.dataInizio?.toDate?.()?.toLocaleDateString('it-IT') || '—';
  return `
    <tr>
      <td class="td-bold">${l.nome || '—'}</td>
      <td>${l.vitigno || '—'}</td>
      <td>${l.annata || '—'}</td>
      <td>${l.litri?.toLocaleString('it-IT') || '—'} L</td>
      <td><span class="td-mono">${l.vasca || '—'}</span></td>
      <td><span class="badge ${cfg.badge}">${cfg.label}</span></td>
      <td style="white-space:nowrap">${dateStr}</td>
      <td class="td-actions">
        <button class="btn-icon btn-edit-lotto" data-id="${l.id}" title="Modifica">✏️</button>
        <button class="btn-icon danger btn-del-lotto" data-id="${l.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

function openAddLottoModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuovo Lotto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Nome Lotto</label><input id="fl-nome" placeholder="es. Barolo DOCG 2024"></div>
        <div class="field"><label>Vitigno</label><input id="fl-vitigno" placeholder="es. Nebbiolo"></div>
        <div class="field"><label>Annata</label><input id="fl-annata" type="number" placeholder="${new Date().getFullYear()}"></div>
        <div class="field"><label>Litri</label><input id="fl-litri" type="number" placeholder="0"></div>
        <div class="field"><label>Vasca</label><input id="fl-vasca" placeholder="es. A1"></div>
        <div class="field"><label>Stato</label>
          <select id="fl-stato">
            <option value="fermentazione">Fermentazione</option>
            <option value="affinamento">Affinamento</option>
            <option value="pronto">Pronto</option>
            <option value="imbottigliato">Imbottigliato</option>
          </select>
        </div>
        <div class="field"><label>Data Inizio</label><input id="fl-data" type="date"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fl-note" placeholder="Note aggiuntive…"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-lotto">Salva Lotto</button>
    </div>
  `);

  document.getElementById('fl-data').value = new Date().toISOString().slice(0, 10);
  document.getElementById('btn-save-lotto').addEventListener('click', async () => {
    const nome = document.getElementById('fl-nome').value.trim();
    if (!nome) { window.showToast('Inserisci il nome del lotto', 'error'); return; }
    try {
      await addDoc(collection(_db, 'cantina_lotti'), {
        nome,
        vitigno:   document.getElementById('fl-vitigno').value.trim(),
        annata:    parseInt(document.getElementById('fl-annata').value) || new Date().getFullYear(),
        litri:     parseFloat(document.getElementById('fl-litri').value) || 0,
        vasca:     document.getElementById('fl-vasca').value.trim(),
        stato:     document.getElementById('fl-stato').value,
        note:      document.getElementById('fl-note').value.trim(),
        dataInizio: Timestamp.fromDate(new Date(document.getElementById('fl-data').value || Date.now())),
        createdAt:  Timestamp.now(),
      });
      bk.remove();
      window.showToast('Lotto aggiunto con successo');
      loadLotti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

function openEditLottoModal(l) {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Modifica Lotto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Nome Lotto</label><input id="fl-nome" value="${l.nome || ''}"></div>
        <div class="field"><label>Vitigno</label><input id="fl-vitigno" value="${l.vitigno || ''}"></div>
        <div class="field"><label>Annata</label><input id="fl-annata" type="number" value="${l.annata || ''}"></div>
        <div class="field"><label>Litri</label><input id="fl-litri" type="number" value="${l.litri || ''}"></div>
        <div class="field"><label>Vasca</label><input id="fl-vasca" value="${l.vasca || ''}"></div>
        <div class="field"><label>Stato</label>
          <select id="fl-stato">
            ${['fermentazione','affinamento','pronto','imbottigliato'].map(s => `<option value="${s}" ${l.stato===s?'selected':''}>${statoLottoConfig[s]?.label||s}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Data Inizio</label><input id="fl-data" type="date" value="${l.dataInizio?.toDate?.()?.toISOString().slice(0,10) || ''}"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fl-note">${l.note || ''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-lotto">Salva Modifiche</button>
    </div>
  `);

  document.getElementById('btn-save-lotto').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'cantina_lotti', l.id), {
        nome:     document.getElementById('fl-nome').value.trim(),
        vitigno:  document.getElementById('fl-vitigno').value.trim(),
        annata:   parseInt(document.getElementById('fl-annata').value),
        litri:    parseFloat(document.getElementById('fl-litri').value) || 0,
        vasca:    document.getElementById('fl-vasca').value.trim(),
        stato:    document.getElementById('fl-stato').value,
        note:     document.getElementById('fl-note').value.trim(),
        dataInizio: Timestamp.fromDate(new Date(document.getElementById('fl-data').value)),
      });
      bk.remove();
      window.showToast('Lotto aggiornato');
      loadLotti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteLotto(id) {
  if (!confirm('Eliminare questo lotto? L\'operazione non è reversibile.')) return;
  try {
    await deleteDoc(doc(_db, 'cantina_lotti', id));
    window.showToast('Lotto eliminato');
    loadLotti();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}

// ── Vasche ────────────────────────────────
async function loadVasche() {
  const tab = document.getElementById('tab-vasche');
  tab.innerHTML = '<div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'cantina_vasche'), orderBy('codice')));
    const vasche = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const libreN   = vasche.filter(v => v.stato === 'libera').length;
    const occupN   = vasche.filter(v => v.stato === 'occupata').length;
    const manutN   = vasche.filter(v => v.stato === 'manutenzione').length;
    const totCap   = vasche.reduce((s, v) => s + (v.capacita || 0), 0);

    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-green"><span class="kpi-icon">✓</span><div class="kpi-label">Libere</div><div class="kpi-value">${libreN}</div></div>
        <div class="kpi-card k-burgundy"><span class="kpi-icon">⬤</span><div class="kpi-label">Occupate</div><div class="kpi-value">${occupN}</div></div>
        <div class="kpi-card k-gold"><span class="kpi-icon">⚙</span><div class="kpi-label">Manutenzione</div><div class="kpi-value">${manutN}</div></div>
        <div class="kpi-card"><span class="kpi-icon">💧</span><div class="kpi-label">Capacità Totale</div><div class="kpi-value">${(totCap/1000).toFixed(0)} kL</div></div>
      </div>
      <div class="vasca-grid" id="vasca-grid">
        ${vasche.map(v => renderVascaCard(v)).join('')}
      </div>
    `;

    tab.querySelectorAll('.btn-edit-vasca').forEach(btn => {
      btn.addEventListener('click', () => openEditVascaModal(vasche.find(v => v.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-vasca').forEach(btn => {
      btn.addEventListener('click', () => deleteVasca(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

function renderVascaCard(v) {
  const statoColor = { libera: 'badge-green', occupata: 'badge-blue', manutenzione: 'badge-amber' };
  const pct = v.stato === 'occupata' ? 100 : 0;
  return `
    <div class="vasca-card">
      <div class="vasca-code">${v.codice}</div>
      <div class="vasca-type">${v.tipo} · ${(v.capacita/1000).toFixed(0)}kL</div>
      <span class="badge ${statoColor[v.stato] || 'badge-grey'}">${v.stato}</span>
      <div class="vasca-bar-wrap"><div class="vasca-bar" style="width:${pct}%"></div></div>
      ${v.lottoNome ? `<div class="vasca-lotto">${v.lottoNome}</div>` : ''}
      <div style="display:flex;gap:6px;margin-top:12px;justify-content:center">
        <button class="btn-icon btn-edit-vasca" data-id="${v.id}" title="Modifica">✏️</button>
        <button class="btn-icon danger btn-del-vasca" data-id="${v.id}" title="Elimina">🗑</button>
      </div>
    </div>
  `;
}

function openAddVascaModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuova Vasca</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Codice</label><input id="fv-codice" placeholder="es. D1"></div>
        <div class="field"><label>Tipo</label>
          <select id="fv-tipo">
            <option value="acciaio">Acciaio inox</option>
            <option value="cemento">Cemento</option>
            <option value="legno">Legno / Barrique</option>
            <option value="vetroresina">Vetroresina</option>
          </select>
        </div>
        <div class="field"><label>Capacità (litri)</label><input id="fv-cap" type="number" placeholder="10000"></div>
        <div class="field"><label>Stato</label>
          <select id="fv-stato">
            <option value="libera">Libera</option>
            <option value="occupata">Occupata</option>
            <option value="manutenzione">Manutenzione</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Lotto Contenuto (se occupata)</label><input id="fv-lotto" placeholder="Nome del lotto…"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-vasca">Salva Vasca</button>
    </div>
  `);

  document.getElementById('btn-save-vasca').addEventListener('click', async () => {
    const codice = document.getElementById('fv-codice').value.trim();
    if (!codice) { window.showToast('Inserisci il codice vasca', 'error'); return; }
    try {
      await addDoc(collection(_db, 'cantina_vasche'), {
        codice,
        tipo:      document.getElementById('fv-tipo').value,
        capacita:  parseFloat(document.getElementById('fv-cap').value) || 0,
        stato:     document.getElementById('fv-stato').value,
        lottoNome: document.getElementById('fv-lotto').value.trim(),
        createdAt: Timestamp.now(),
      });
      bk.remove();
      window.showToast('Vasca aggiunta');
      loadVasche();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

function openEditVascaModal(v) {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Modifica Vasca ${v.codice}</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Codice</label><input id="fv-codice" value="${v.codice || ''}"></div>
        <div class="field"><label>Tipo</label>
          <select id="fv-tipo">
            ${['acciaio','cemento','legno','vetroresina'].map(t => `<option value="${t}" ${v.tipo===t?'selected':''}>${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Capacità (litri)</label><input id="fv-cap" type="number" value="${v.capacita || 0}"></div>
        <div class="field"><label>Stato</label>
          <select id="fv-stato">
            ${['libera','occupata','manutenzione'].map(s => `<option value="${s}" ${v.stato===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
          </select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Lotto Contenuto</label><input id="fv-lotto" value="${v.lottoNome || ''}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-vasca">Salva Modifiche</button>
    </div>
  `);

  document.getElementById('btn-save-vasca').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'cantina_vasche', v.id), {
        codice:    document.getElementById('fv-codice').value.trim(),
        tipo:      document.getElementById('fv-tipo').value,
        capacita:  parseFloat(document.getElementById('fv-cap').value) || 0,
        stato:     document.getElementById('fv-stato').value,
        lottoNome: document.getElementById('fv-lotto').value.trim(),
      });
      bk.remove();
      window.showToast('Vasca aggiornata');
      loadVasche();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteVasca(id) {
  if (!confirm('Eliminare questa vasca?')) return;
  try {
    await deleteDoc(doc(_db, 'cantina_vasche', id));
    window.showToast('Vasca eliminata');
    loadVasche();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}
