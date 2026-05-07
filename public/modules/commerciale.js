import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let _db;

const STATI_ORDINE = {
  bozza:          { badge: 'badge-grey',  label: 'Bozza' },
  confermato:     { badge: 'badge-blue',  label: 'Confermato' },
  in_preparazione:{ badge: 'badge-amber', label: 'In preparazione' },
  spedito:        { badge: 'badge-green', label: 'Spedito' },
  consegnato:     { badge: 'badge-green', label: 'Consegnato' },
  annullato:      { badge: 'badge-red',   label: 'Annullato' },
};

const TIPI_CLIENTE = {
  enoteca: { icon: '🍾', label: 'Enoteca' },
  horeca:  { icon: '🍽',  label: 'HoReCa' },
  privato: { icon: '👤', label: 'Privato' },
  export:  { icon: '🌍', label: 'Export' },
  gdo:     { icon: '🏪', label: 'GDO' },
};

export async function init(container, db) {
  _db = db;
  container.innerHTML = `
    <div class="header-row">
      <div>
        <div class="page-title">📋 Commerciale</div>
        <div class="page-subtitle">Clienti, ordini e amministrazione vendite</div>
      </div>
      <div class="module-actions" id="comm-actions"></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="ordini">Ordini</button>
      <button class="tab-btn" data-tab="clienti">Clienti</button>
    </div>
    <div id="tab-ordini" class="tab-content active"></div>
    <div id="tab-clienti" class="tab-content"></div>
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

  await Promise.all([loadOrdini(), loadClienti()]);
  updateActions('ordini');
}

function updateActions(tab) {
  const d = document.getElementById('comm-actions');
  if (tab === 'ordini') {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-ord">＋ Nuovo Ordine</button>`;
    document.getElementById('btn-add-ord').addEventListener('click', openAddOrdineModal);
  } else {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-cli">＋ Nuovo Cliente</button>`;
    document.getElementById('btn-add-cli').addEventListener('click', openAddClienteModal);
  }
}

// ── Ordini ────────────────────────────────
async function loadOrdini() {
  const tab = document.getElementById('tab-ordini');
  tab.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'commerciale_ordini'), orderBy('data', 'desc')));
    const ordini = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!ordini.length) {
      tab.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">📋</span><strong>Nessun ordine</strong><p>Crea il primo ordine di vendita.</p></div></div>';
      return;
    }

    const aperti     = ordini.filter(o => !['spedito','consegnato','annullato'].includes(o.stato));
    const fatturato  = ordini.filter(o => ['spedito','consegnato'].includes(o.stato)).reduce((s, o) => s + (o.totale || 0), 0);
    const inPrep     = ordini.filter(o => o.stato === 'in_preparazione').length;
    const daSpedire  = ordini.filter(o => o.stato === 'confermato').length;

    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-gold">
          <span class="kpi-icon">💶</span>
          <div class="kpi-label">Fatturato (spediti)</div>
          <div class="kpi-value" style="font-size:1.5rem">€ ${fatturato.toLocaleString('it-IT',{minimumFractionDigits:2})}</div>
        </div>
        <div class="kpi-card k-burgundy">
          <span class="kpi-icon">📋</span>
          <div class="kpi-label">Ordini Aperti</div>
          <div class="kpi-value">${aperti.length}</div>
          <div class="kpi-sub">su ${ordini.length} totali</div>
        </div>
        <div class="kpi-card k-terra">
          <span class="kpi-icon">⚙</span>
          <div class="kpi-label">In Preparazione</div>
          <div class="kpi-value">${inPrep}</div>
        </div>
        <div class="kpi-card k-green">
          <span class="kpi-icon">📦</span>
          <div class="kpi-label">Da Spedire</div>
          <div class="kpi-value">${daSpedire}</div>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Numero</th>
                <th>Data</th>
                <th>Cliente</th>
                <th>Righe</th>
                <th>Totale</th>
                <th>Stato</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${ordini.map(o => renderOrdineRow(o)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tab.querySelectorAll('.btn-view-ord').forEach(btn => {
      btn.addEventListener('click', () => openViewOrdineModal(ordini.find(o => o.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-stato-ord').forEach(btn => {
      btn.addEventListener('click', () => openCambiaStatoModal(ordini.find(o => o.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-ord').forEach(btn => {
      btn.addEventListener('click', () => deleteOrdine(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="card"><div class="empty-state">⚠️ ${err.message}</div></div>`;
  }
}

function renderOrdineRow(o) {
  const cfg     = STATI_ORDINE[o.stato] || { badge: 'badge-grey', label: o.stato };
  const dateStr = o.data?.toDate?.()?.toLocaleDateString('it-IT') || '—';
  const righe   = Array.isArray(o.righe) ? o.righe.length : '—';
  return `
    <tr>
      <td class="td-bold td-mono">${o.numero || '—'}</td>
      <td style="white-space:nowrap">${dateStr}</td>
      <td>${o.clienteNome || '—'}</td>
      <td style="text-align:center">${righe}</td>
      <td style="font-weight:600">€ ${o.totale?.toLocaleString('it-IT',{minimumFractionDigits:2}) || '—'}</td>
      <td><span class="badge ${cfg.badge}">${cfg.label}</span></td>
      <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-muted);font-size:0.78rem">${o.note || ''}</td>
      <td class="td-actions">
        <button class="btn-icon btn-view-ord" data-id="${o.id}" title="Dettaglio">👁</button>
        <button class="btn-icon btn-stato-ord" data-id="${o.id}" title="Cambia stato">🔄</button>
        <button class="btn-icon danger btn-del-ord" data-id="${o.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

function openViewOrdineModal(o) {
  const cfg     = STATI_ORDINE[o.stato] || { badge: 'badge-grey', label: o.stato };
  const dateStr = o.data?.toDate?.()?.toLocaleDateString('it-IT') || '—';
  const righe   = Array.isArray(o.righe) ? o.righe : [];

  window.openModal(`
    <div class="modal-header">
      <div class="modal-title">${o.numero}</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-bottom:20px">
        <div><div class="kpi-label">Cliente</div><div style="font-weight:600;margin-top:3px">${o.clienteNome}</div></div>
        <div><div class="kpi-label">Data</div><div style="font-weight:600;margin-top:3px">${dateStr}</div></div>
        <div><div class="kpi-label">Stato</div><div style="margin-top:3px"><span class="badge ${cfg.badge}">${cfg.label}</span></div></div>
      </div>
      <div class="card-title" style="margin-bottom:10px">Righe Ordine</div>
      <table style="width:100%;font-size:0.85rem;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:7px 0;border-bottom:1.5px solid var(--card-border);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">Prodotto</th>
            <th style="text-align:right;padding:7px 0;border-bottom:1.5px solid var(--card-border);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">Qta</th>
            <th style="text-align:right;padding:7px 0;border-bottom:1.5px solid var(--card-border);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">Prezzo u.</th>
            <th style="text-align:right;padding:7px 0;border-bottom:1.5px solid var(--card-border);font-size:0.68rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-muted)">Subtotale</th>
          </tr>
        </thead>
        <tbody>
          ${righe.map(r => `
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid rgba(180,140,90,0.10)">${r.prodottoNome}</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(180,140,90,0.10);text-align:right">${r.quantita}</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(180,140,90,0.10);text-align:right">€ ${r.prezzo?.toFixed(2)}</td>
              <td style="padding:10px 0;border-bottom:1px solid rgba(180,140,90,0.10);text-align:right;font-weight:600">€ ${(r.quantita * r.prezzo).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding-top:12px;font-weight:700;font-size:0.9rem">TOTALE</td>
            <td style="padding-top:12px;text-align:right;font-weight:700;font-size:1.1rem;color:var(--burgundy)">€ ${o.totale?.toLocaleString('it-IT',{minimumFractionDigits:2})}</td>
          </tr>
        </tfoot>
      </table>
      ${o.note ? `<div style="margin-top:16px;padding:12px;background:var(--input-bg);border-radius:var(--radius-sm);font-size:0.82rem;color:var(--text-secondary)"><strong>Note:</strong> ${o.note}</div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Chiudi</button>
    </div>
  `);
}

function openCambiaStatoModal(o) {
  const cfg = STATI_ORDINE[o.stato] || {};
  const bk  = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Cambia Stato — ${o.numero}</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="field">
        <label>Stato attuale</label>
        <div style="margin:8px 0"><span class="badge ${cfg.badge}">${cfg.label || o.stato}</span></div>
      </div>
      <div class="field" style="margin-top:14px">
        <label>Nuovo Stato</label>
        <select id="fs-stato">
          ${Object.entries(STATI_ORDINE).map(([k,v]) => `<option value="${k}" ${o.stato===k?'selected':''}>${v.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-stato">Aggiorna</button>
    </div>
  `);

  document.getElementById('btn-save-stato').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'commerciale_ordini', o.id), { stato: document.getElementById('fs-stato').value });
      bk.remove();
      window.showToast('Stato aggiornato');
      loadOrdini();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function openAddOrdineModal() {
  let clienti = [], prodotti = [];
  try {
    const [cs, ps] = await Promise.all([
      getDocs(query(collection(_db, 'commerciale_clienti'), orderBy('ragione_sociale'))),
      getDocs(query(collection(_db, 'magazzino_prodotti'), orderBy('nome'))),
    ]);
    clienti  = cs.docs.map(d => ({ id: d.id, ...d.data() }));
    prodotti = ps.docs.filter(d => d.data().categoria === 'vino').map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  // Genera numero ordine
  const snap  = await getDocs(collection(_db, 'commerciale_ordini'));
  const anno  = new Date().getFullYear();
  const n     = snap.size + 1;
  const num   = `ORD-${anno}-${String(n).padStart(3,'0')}`;

  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuovo Ordine — ${num}</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Cliente</label>
          <select id="fo-cli">
            <option value="">— Seleziona cliente —</option>
            ${clienti.map(c => `<option value="${c.id}" data-nome="${c.ragione_sociale}">${c.ragione_sociale}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Data</label><input id="fo-data" type="date"></div>
      </div>

      <div style="margin-top:20px">
        <div class="card-title" style="margin-bottom:12px">Righe Ordine</div>
        <div id="righe-container"></div>
        <button class="btn btn-ghost btn-sm mt-8" id="btn-add-riga">＋ Aggiungi Riga</button>
      </div>

      <div style="margin-top:20px;padding:12px 14px;background:var(--input-bg);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center">
        <span style="font-weight:600">Totale Ordine</span>
        <span style="font-size:1.2rem;font-weight:700;color:var(--burgundy)" id="fo-totale">€ 0,00</span>
      </div>

      <div class="field mt-16"><label>Note</label><textarea id="fo-note" placeholder="Note sull'ordine…" style="height:60px"></textarea></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-ord">Crea Ordine</button>
    </div>
  `);

  document.getElementById('fo-data').value = new Date().toISOString().slice(0, 10);

  let righeCount = 0;
  function aggiungiRiga() {
    righeCount++;
    const div = document.createElement('div');
    div.id = `riga-${righeCount}`;
    div.style.cssText = 'display:grid;grid-template-columns:1fr 80px 100px 30px;gap:8px;margin-bottom:8px;align-items:end';
    div.innerHTML = `
      <div class="field"><label>${righeCount === 1 ? 'Prodotto' : ''}</label>
        <select class="riga-prod" data-riga="${righeCount}">
          <option value="">— Prodotto —</option>
          ${prodotti.map(p => `<option value="${p.id}" data-nome="${p.nome}" data-prezzo="${p.prezzo_listino||0}">${p.nome}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>${righeCount === 1 ? 'Qtà' : ''}</label><input type="number" class="riga-qty" data-riga="${righeCount}" placeholder="0" min="1"></div>
      <div class="field"><label>${righeCount === 1 ? 'Prezzo u.' : ''}</label><input type="number" class="riga-prezzo" data-riga="${righeCount}" step="0.01" placeholder="0.00"></div>
      <button class="btn-icon danger riga-del" data-riga="${righeCount}" style="margin-bottom:2px" title="Rimuovi">✕</button>
    `;
    document.getElementById('righe-container').appendChild(div);

    div.querySelector('.riga-prod').addEventListener('change', function() {
      const sel     = this;
      const prezzo  = sel.options[sel.selectedIndex]?.dataset?.prezzo || 0;
      div.querySelector('.riga-prezzo').value = prezzo;
      ricalcolaTotale();
    });
    div.querySelector('.riga-qty').addEventListener('input', ricalcolaTotale);
    div.querySelector('.riga-prezzo').addEventListener('input', ricalcolaTotale);
    div.querySelector('.riga-del').addEventListener('click', () => {
      div.remove(); ricalcolaTotale();
    });
  }

  function ricalcolaTotale() {
    let tot = 0;
    document.querySelectorAll('.riga-qty').forEach((el, i) => {
      const qty   = parseFloat(el.value) || 0;
      const pEl   = document.querySelectorAll('.riga-prezzo')[i];
      const prezzo = pEl ? parseFloat(pEl.value) || 0 : 0;
      tot += qty * prezzo;
    });
    document.getElementById('fo-totale').textContent = '€ ' + tot.toLocaleString('it-IT',{minimumFractionDigits:2});
    return tot;
  }

  document.getElementById('btn-add-riga').addEventListener('click', aggiungiRiga);
  aggiungiRiga();

  document.getElementById('btn-save-ord').addEventListener('click', async () => {
    const cliSel = document.getElementById('fo-cli');
    if (!cliSel.value) { window.showToast('Seleziona un cliente', 'error'); return; }

    const righe = [];
    const prods  = document.querySelectorAll('.riga-prod');
    const qtys   = document.querySelectorAll('.riga-qty');
    const prezzi = document.querySelectorAll('.riga-prezzo');

    for (let i = 0; i < prods.length; i++) {
      const prodSel = prods[i];
      if (!prodSel.value) continue;
      const qty    = parseFloat(qtys[i].value) || 0;
      const prezzo = parseFloat(prezzi[i].value) || 0;
      if (qty <= 0) continue;
      righe.push({
        prodottoId:   prodSel.value,
        prodottoNome: prodSel.options[prodSel.selectedIndex].dataset.nome,
        quantita:     qty,
        prezzo,
      });
    }

    if (!righe.length) { window.showToast('Aggiungi almeno una riga', 'error'); return; }

    const totale = righe.reduce((s, r) => s + r.quantita * r.prezzo, 0);

    try {
      await addDoc(collection(_db, 'commerciale_ordini'), {
        numero:       num,
        clienteId:    cliSel.value,
        clienteNome:  cliSel.options[cliSel.selectedIndex].dataset.nome,
        data:         Timestamp.fromDate(new Date(document.getElementById('fo-data').value)),
        stato:        'bozza',
        righe,
        totale,
        note:         document.getElementById('fo-note').value.trim(),
        createdAt:    Timestamp.now(),
      });
      bk.remove();
      window.showToast('Ordine creato');
      loadOrdini();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteOrdine(id) {
  if (!confirm('Eliminare questo ordine?')) return;
  try {
    await deleteDoc(doc(_db, 'commerciale_ordini', id));
    window.showToast('Ordine eliminato');
    loadOrdini();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}

// ── Clienti ───────────────────────────────
async function loadClienti() {
  const tab = document.getElementById('tab-clienti');
  tab.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'commerciale_clienti'), orderBy('ragione_sociale')));
    const clienti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!clienti.length) {
      tab.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">👥</span><strong>Nessun cliente</strong><p>Aggiungi il primo cliente.</p></div></div>';
      return;
    }

    const tipiCount = {};
    clienti.forEach(c => { tipiCount[c.tipo] = (tipiCount[c.tipo] || 0) + 1; });

    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-burgundy"><span class="kpi-icon">👥</span><div class="kpi-label">Clienti Totali</div><div class="kpi-value">${clienti.length}</div></div>
        <div class="kpi-card k-gold"><span class="kpi-icon">🍾</span><div class="kpi-label">Enoteche</div><div class="kpi-value">${tipiCount.enoteca||0}</div></div>
        <div class="kpi-card k-terra"><span class="kpi-icon">🍽</span><div class="kpi-label">HoReCa</div><div class="kpi-value">${tipiCount.horeca||0}</div></div>
        <div class="kpi-card k-green"><span class="kpi-icon">🌍</span><div class="kpi-label">Export</div><div class="kpi-value">${tipiCount.export||0}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ragione Sociale</th>
                <th>Tipo</th>
                <th>Città / Paese</th>
                <th>Email</th>
                <th>Telefono</th>
                <th>Listino</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${clienti.map(c => renderClienteRow(c)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tab.querySelectorAll('.btn-edit-cli').forEach(btn => {
      btn.addEventListener('click', () => openEditClienteModal(clienti.find(c => c.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-cli').forEach(btn => {
      btn.addEventListener('click', () => deleteCliente(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="card"><div class="empty-state">⚠️ ${err.message}</div></div>`;
  }
}

function renderClienteRow(c) {
  const cfg = TIPI_CLIENTE[c.tipo] || { icon: '👤', label: c.tipo };
  const listinoBadge = { A: 'badge-green', B: 'badge-blue', C: 'badge-amber' };
  return `
    <tr>
      <td class="td-bold">${c.ragione_sociale}</td>
      <td><span class="badge badge-grey">${cfg.icon} ${cfg.label}</span></td>
      <td>${c.citta || '—'}${c.paese && c.paese !== 'Italia' ? ` <span style="color:var(--text-muted);font-size:0.75rem">${c.paese}</span>` : ''}</td>
      <td style="font-size:0.8rem;color:var(--text-secondary)">${c.email ? `<a href="mailto:${c.email}" style="color:var(--burgundy)">${c.email}</a>` : '—'}</td>
      <td style="font-size:0.82rem">${c.telefono || '—'}</td>
      <td><span class="badge ${listinoBadge[c.listino] || 'badge-grey'}">Listino ${c.listino || '—'}</span></td>
      <td class="td-actions">
        <button class="btn-icon btn-edit-cli" data-id="${c.id}" title="Modifica">✏️</button>
        <button class="btn-icon danger btn-del-cli" data-id="${c.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

function openAddClienteModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuovo Cliente</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Ragione Sociale</label><input id="fc-rs" placeholder="Nome azienda o persona…"></div>
        <div class="field"><label>Tipo Cliente</label>
          <select id="fc-tipo">
            ${Object.entries(TIPI_CLIENTE).map(([k,v])=>`<option value="${k}">${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Listino</label>
          <select id="fc-listino">
            <option value="A">A — Horeca / Premium</option>
            <option value="B">B — Enoteca / Standard</option>
            <option value="C">C — Export / Speciale</option>
          </select>
        </div>
        <div class="field"><label>P.IVA / CF</label><input id="fc-piva" placeholder="es. IT01234567890"></div>
        <div class="field"><label>Telefono</label><input id="fc-tel" placeholder="+39 …"></div>
        <div class="field" style="grid-column:1/-1"><label>Email</label><input id="fc-email" type="email" placeholder="email@…"></div>
        <div class="field" style="grid-column:1/-1"><label>Indirizzo</label><input id="fc-ind" placeholder="Via / Corso…"></div>
        <div class="field"><label>Città</label><input id="fc-citta" placeholder="es. Roma"></div>
        <div class="field"><label>Paese</label><input id="fc-paese" value="Italia"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fc-note" placeholder="Note interne…" style="height:60px"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-cli">Salva Cliente</button>
    </div>
  `);

  document.getElementById('btn-save-cli').addEventListener('click', async () => {
    const rs = document.getElementById('fc-rs').value.trim();
    if (!rs) { window.showToast('Inserisci la ragione sociale', 'error'); return; }
    try {
      await addDoc(collection(_db, 'commerciale_clienti'), {
        ragione_sociale: rs,
        tipo:            document.getElementById('fc-tipo').value,
        listino:         document.getElementById('fc-listino').value,
        piva:            document.getElementById('fc-piva').value.trim(),
        telefono:        document.getElementById('fc-tel').value.trim(),
        email:           document.getElementById('fc-email').value.trim(),
        indirizzo:       document.getElementById('fc-ind').value.trim(),
        citta:           document.getElementById('fc-citta').value.trim(),
        paese:           document.getElementById('fc-paese').value.trim(),
        note:            document.getElementById('fc-note').value.trim(),
        createdAt:       Timestamp.now(),
      });
      bk.remove();
      window.showToast('Cliente aggiunto');
      loadClienti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

function openEditClienteModal(c) {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Modifica Cliente</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field" style="grid-column:1/-1"><label>Ragione Sociale</label><input id="fc-rs" value="${c.ragione_sociale||''}"></div>
        <div class="field"><label>Tipo Cliente</label>
          <select id="fc-tipo">
            ${Object.entries(TIPI_CLIENTE).map(([k,v])=>`<option value="${k}" ${c.tipo===k?'selected':''}>${v.icon} ${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Listino</label>
          <select id="fc-listino">
            ${['A','B','C'].map(l=>`<option value="${l}" ${c.listino===l?'selected':''}>Listino ${l}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>P.IVA / CF</label><input id="fc-piva" value="${c.piva||''}"></div>
        <div class="field"><label>Telefono</label><input id="fc-tel" value="${c.telefono||''}"></div>
        <div class="field" style="grid-column:1/-1"><label>Email</label><input id="fc-email" type="email" value="${c.email||''}"></div>
        <div class="field" style="grid-column:1/-1"><label>Indirizzo</label><input id="fc-ind" value="${c.indirizzo||''}"></div>
        <div class="field"><label>Città</label><input id="fc-citta" value="${c.citta||''}"></div>
        <div class="field"><label>Paese</label><input id="fc-paese" value="${c.paese||'Italia'}"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fc-note" style="height:60px">${c.note||''}</textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-cli">Salva Modifiche</button>
    </div>
  `);

  document.getElementById('btn-save-cli').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'commerciale_clienti', c.id), {
        ragione_sociale: document.getElementById('fc-rs').value.trim(),
        tipo:            document.getElementById('fc-tipo').value,
        listino:         document.getElementById('fc-listino').value,
        piva:            document.getElementById('fc-piva').value.trim(),
        telefono:        document.getElementById('fc-tel').value.trim(),
        email:           document.getElementById('fc-email').value.trim(),
        indirizzo:       document.getElementById('fc-ind').value.trim(),
        citta:           document.getElementById('fc-citta').value.trim(),
        paese:           document.getElementById('fc-paese').value.trim(),
        note:            document.getElementById('fc-note').value.trim(),
      });
      bk.remove();
      window.showToast('Cliente aggiornato');
      loadClienti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteCliente(id) {
  if (!confirm('Eliminare questo cliente?')) return;
  try {
    await deleteDoc(doc(_db, 'commerciale_clienti', id));
    window.showToast('Cliente eliminato');
    loadClienti();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}
