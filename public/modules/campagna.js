import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let _db;

export async function init(container, db) {
  _db = db;
  container.innerHTML = `
    <div class="header-row">
      <div>
        <div class="page-title">🌿 Campagna</div>
        <div class="page-subtitle">Gestione vigneti e attività agricole</div>
      </div>
      <div class="module-actions" id="campagna-actions"></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="vigneti">Vigneti</button>
      <button class="tab-btn" data-tab="attivita">Attività</button>
    </div>
    <div id="tab-vigneti" class="tab-content active"></div>
    <div id="tab-attivita" class="tab-content"></div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
      updateActions(btn.dataset.tab);
    });
  });

  await Promise.all([loadVigneti(), loadAttivita()]);
  updateActions('vigneti');
}

function updateActions(tab) {
  const d = document.getElementById('campagna-actions');
  if (tab === 'vigneti') {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-vigna">＋ Nuovo Vigneto</button>`;
    document.getElementById('btn-add-vigna').addEventListener('click', openAddVignaModal);
  } else {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-att">＋ Nuova Attività</button>`;
    document.getElementById('btn-add-att').addEventListener('click', openAddAttivitaModal);
  }
}

// ── Vigneti ───────────────────────────────
async function loadVigneti() {
  const tab = document.getElementById('tab-vigneti');
  tab.innerHTML = '<div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'campagna_vigneti'), orderBy('nome')));
    const vigneti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!vigneti.length) {
      tab.innerHTML = '<div class="empty-state"><span class="empty-icon">🌿</span><strong>Nessun vigneto</strong><p>Aggiungi il primo vigneto.</p></div>';
      return;
    }

    const totEttari = vigneti.reduce((s, v) => s + (v.ettari || 0), 0);
    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-green"><span class="kpi-icon">🌿</span><div class="kpi-label">Ettari Totali</div><div class="kpi-value">${totEttari.toFixed(1)}</div></div>
        <div class="kpi-card k-gold"><span class="kpi-icon">🍇</span><div class="kpi-label">Vigneti</div><div class="kpi-value">${vigneti.length}</div></div>
        <div class="kpi-card k-burgundy"><span class="kpi-icon">🗺</span><div class="kpi-label">Comuni</div><div class="kpi-value">${[...new Set(vigneti.map(v=>v.comune))].length}</div></div>
        <div class="kpi-card"><span class="kpi-icon">📍</span><div class="kpi-label">Vitigni Diversi</div><div class="kpi-value">${[...new Set(vigneti.map(v=>v.vitigno))].length}</div></div>
      </div>
      <div class="vigna-grid" id="vigna-grid">
        ${vigneti.map(v => renderVignaCard(v)).join('')}
      </div>
    `;

    tab.querySelectorAll('.btn-edit-vigna').forEach(btn => {
      btn.addEventListener('click', () => openEditVignaModal(vigneti.find(v => v.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-vigna').forEach(btn => {
      btn.addEventListener('click', () => deleteVigna(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

function renderVignaCard(v) {
  const eta = v.anno_impianto ? new Date().getFullYear() - v.anno_impianto : null;
  return `
    <div class="vigna-card">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div class="vigna-name">${v.nome}</div>
        <div style="display:flex;gap:6px">
          <button class="btn-icon btn-edit-vigna" data-id="${v.id}" title="Modifica">✏️</button>
          <button class="btn-icon danger btn-del-vigna" data-id="${v.id}" title="Elimina">🗑</button>
        </div>
      </div>
      ${v.denominazione ? `<div class="mb-8"><span class="badge badge-gold">${v.denominazione}</span></div>` : ''}
      <div class="vigna-meta">
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Vitigno</div>
          <div class="vigna-meta-value">${v.vitigno || '—'}</div>
        </div>
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Ettari</div>
          <div class="vigna-meta-value">${v.ettari || '—'} ha</div>
        </div>
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Comune</div>
          <div class="vigna-meta-value">${v.comune || '—'}</div>
        </div>
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Altitudine</div>
          <div class="vigna-meta-value">${v.altitudine || '—'} m</div>
        </div>
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Esposizione</div>
          <div class="vigna-meta-value">${v.esposizione || '—'}</div>
        </div>
        <div class="vigna-meta-item">
          <div class="vigna-meta-label">Età Viti</div>
          <div class="vigna-meta-value">${eta ? eta + ' anni' : '—'}</div>
        </div>
      </div>
      ${v.note ? `<div style="margin-top:12px;font-size:0.78rem;color:var(--text-muted);font-style:italic">${v.note}</div>` : ''}
    </div>
  `;
}

function openAddVignaModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuovo Vigneto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Nome Vigneto</label><input id="fvg-nome" placeholder="es. Vigna Alta"></div>
        <div class="field"><label>Vitigno</label><input id="fvg-vitigno" placeholder="es. Aglianico"></div>
        <div class="field"><label>Denominazione</label><input id="fvg-den" placeholder="es. Aglianico del Taburno DOCG"></div>
        <div class="field"><label>Ettari</label><input id="fvg-ettari" type="number" step="0.1" placeholder="0.0"></div>
        <div class="field"><label>Anno Impianto</label><input id="fvg-anno" type="number" placeholder="${new Date().getFullYear()}"></div>
        <div class="field"><label>Comune</label><input id="fvg-comune" placeholder="es. Guardia Sanframondi"></div>
        <div class="field"><label>Esposizione</label>
          <select id="fvg-esp">
            <option value="">— Seleziona —</option>
            <option>Nord</option><option>Nord-Est</option><option>Est</option>
            <option>Sud-Est</option><option>Sud</option><option>Sud-Ovest</option>
            <option>Ovest</option><option>Nord-Ovest</option>
          </select>
        </div>
        <div class="field"><label>Altitudine (m)</label><input id="fvg-alt" type="number" placeholder="0"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fvg-note" placeholder="Note aggiuntive…"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-vigna">Salva Vigneto</button>
    </div>
  `);

  document.getElementById('btn-save-vigna').addEventListener('click', async () => {
    const nome = document.getElementById('fvg-nome').value.trim();
    if (!nome) { window.showToast('Inserisci il nome del vigneto', 'error'); return; }
    try {
      await addDoc(collection(_db, 'campagna_vigneti'), {
        nome,
        vitigno:       document.getElementById('fvg-vitigno').value.trim(),
        denominazione: document.getElementById('fvg-den').value.trim(),
        ettari:        parseFloat(document.getElementById('fvg-ettari').value) || 0,
        anno_impianto: parseInt(document.getElementById('fvg-anno').value) || null,
        comune:        document.getElementById('fvg-comune').value.trim(),
        esposizione:   document.getElementById('fvg-esp').value,
        altitudine:    parseInt(document.getElementById('fvg-alt').value) || null,
        note:          document.getElementById('fvg-note').value.trim(),
        createdAt:     Timestamp.now(),
      });
      bk.remove();
      window.showToast('Vigneto aggiunto');
      loadVigneti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

function openEditVignaModal(v) {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Modifica Vigneto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Nome Vigneto</label><input id="fvg-nome" value="${v.nome||''}"></div>
        <div class="field"><label>Vitigno</label><input id="fvg-vitigno" value="${v.vitigno||''}"></div>
        <div class="field"><label>Denominazione</label><input id="fvg-den" value="${v.denominazione||''}"></div>
        <div class="field"><label>Ettari</label><input id="fvg-ettari" type="number" step="0.1" value="${v.ettari||''}"></div>
        <div class="field"><label>Anno Impianto</label><input id="fvg-anno" type="number" value="${v.anno_impianto||''}"></div>
        <div class="field"><label>Comune</label><input id="fvg-comune" value="${v.comune||''}"></div>
        <div class="field"><label>Esposizione</label>
          <select id="fvg-esp">
            <option value="">— Seleziona —</option>
            ${['Nord','Nord-Est','Est','Sud-Est','Sud','Sud-Ovest','Ovest','Nord-Ovest'].map(e=>`<option ${v.esposizione===e?'selected':''}>${e}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Altitudine (m)</label><input id="fvg-alt" type="number" value="${v.altitudine||''}"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fvg-note">${v.note||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-vigna">Salva Modifiche</button>
    </div>
  `);

  document.getElementById('btn-save-vigna').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'campagna_vigneti', v.id), {
        nome:          document.getElementById('fvg-nome').value.trim(),
        vitigno:       document.getElementById('fvg-vitigno').value.trim(),
        denominazione: document.getElementById('fvg-den').value.trim(),
        ettari:        parseFloat(document.getElementById('fvg-ettari').value) || 0,
        anno_impianto: parseInt(document.getElementById('fvg-anno').value) || null,
        comune:        document.getElementById('fvg-comune').value.trim(),
        esposizione:   document.getElementById('fvg-esp').value,
        altitudine:    parseInt(document.getElementById('fvg-alt').value) || null,
        note:          document.getElementById('fvg-note').value.trim(),
      });
      bk.remove();
      window.showToast('Vigneto aggiornato');
      loadVigneti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteVigna(id) {
  if (!confirm('Eliminare questo vigneto?')) return;
  try {
    await deleteDoc(doc(_db, 'campagna_vigneti', id));
    window.showToast('Vigneto eliminato');
    loadVigneti();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}

// ── Attività ──────────────────────────────
const tipoAtt = {
  potatura:     { icon: '✂️', badge: 'badge-blue' },
  trattamento:  { icon: '💧', badge: 'badge-amber' },
  concimazione: { icon: '🌱', badge: 'badge-green' },
  vendemmia:    { icon: '🍇', badge: 'badge-gold' },
  altro:        { icon: '📝', badge: 'badge-grey' },
};

async function loadAttivita() {
  const tab = document.getElementById('tab-attivita');
  tab.innerHTML = '<div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'campagna_attivita'), orderBy('data', 'desc')));
    const attivita = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!attivita.length) {
      tab.innerHTML = '<div class="empty-state"><span class="empty-icon">🌿</span><strong>Nessuna attività</strong><p>Registra la prima attività agricola.</p></div>';
      return;
    }

    tab.innerHTML = `
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Vigneto</th>
                <th>Operatori</th>
                <th>Ore</th>
                <th>Prodotti / Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${attivita.map(a => renderAttRow(a)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tab.querySelectorAll('.btn-del-att').forEach(btn => {
      btn.addEventListener('click', () => deleteAtt(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
  }
}

function renderAttRow(a) {
  const cfg = tipoAtt[a.tipo] || { icon: '📝', badge: 'badge-grey' };
  const dateStr = a.data?.toDate?.()?.toLocaleDateString('it-IT') || '—';
  return `
    <tr>
      <td style="white-space:nowrap">${dateStr}</td>
      <td><span class="badge ${cfg.badge}">${cfg.icon} ${a.tipo}</span></td>
      <td class="td-bold">${a.vigna || '—'}</td>
      <td>${a.operatori || '—'}</td>
      <td>${a.ore || '—'} h</td>
      <td style="max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${a.prodotti ? `<span style="color:var(--terracotta)">⚗ ${a.prodotti}</span>` : a.note || '—'}
      </td>
      <td class="td-actions">
        <button class="btn-icon danger btn-del-att" data-id="${a.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

function openAddAttivitaModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuova Attività</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Tipo Attività</label>
          <select id="fa-tipo">
            <option value="potatura">✂️ Potatura</option>
            <option value="trattamento">💧 Trattamento</option>
            <option value="concimazione">🌱 Concimazione</option>
            <option value="vendemmia">🍇 Vendemmia</option>
            <option value="altro">📝 Altro</option>
          </select>
        </div>
        <div class="field"><label>Data</label><input id="fa-data" type="date"></div>
        <div class="field"><label>Vigneto</label><input id="fa-vigna" placeholder="Nome vigneto"></div>
        <div class="field"><label>N° Operatori</label><input id="fa-op" type="number" placeholder="1"></div>
        <div class="field"><label>Ore Lavoro Totali</label><input id="fa-ore" type="number" step="0.5" placeholder="0"></div>
        <div class="field"><label>Prodotti Usati</label><input id="fa-prod" placeholder="es. Rame 2kg/ha"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fa-note" placeholder="Note aggiuntive…"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-att">Salva Attività</button>
    </div>
  `);

  document.getElementById('fa-data').value = new Date().toISOString().slice(0, 10);
  document.getElementById('btn-save-att').addEventListener('click', async () => {
    const vigna = document.getElementById('fa-vigna').value.trim();
    if (!vigna) { window.showToast('Inserisci il nome del vigneto', 'error'); return; }
    try {
      await addDoc(collection(_db, 'campagna_attivita'), {
        tipo:       document.getElementById('fa-tipo').value,
        data:       Timestamp.fromDate(new Date(document.getElementById('fa-data').value)),
        vigna,
        operatori:  parseInt(document.getElementById('fa-op').value) || 1,
        ore:        parseFloat(document.getElementById('fa-ore').value) || 0,
        prodotti:   document.getElementById('fa-prod').value.trim(),
        note:       document.getElementById('fa-note').value.trim(),
        createdAt:  Timestamp.now(),
      });
      bk.remove();
      window.showToast('Attività registrata');
      loadAttivita();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteAtt(id) {
  if (!confirm('Eliminare questa attività?')) return;
  try {
    await deleteDoc(doc(_db, 'campagna_attivita', id));
    window.showToast('Attività eliminata');
    loadAttivita();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}
