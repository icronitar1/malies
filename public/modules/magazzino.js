import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

let _db;

export async function init(container, db) {
  _db = db;
  container.innerHTML = `
    <div class="header-row">
      <div>
        <div class="page-title">📦 Magazzino</div>
        <div class="page-subtitle">Giacenze prodotti finiti e materiali di imbottigliamento</div>
      </div>
      <div class="module-actions" id="mag-actions"></div>
    </div>
    <div class="tabs">
      <button class="tab-btn active" data-tab="prodotti">Prodotti</button>
      <button class="tab-btn" data-tab="movimenti">Movimenti</button>
    </div>
    <div id="tab-prodotti" class="tab-content active"></div>
    <div id="tab-movimenti" class="tab-content"></div>
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

  await Promise.all([loadProdotti(), loadMovimenti()]);
  updateActions('prodotti');
}

function updateActions(tab) {
  const d = document.getElementById('mag-actions');
  if (tab === 'prodotti') {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-prod">＋ Nuovo Prodotto</button>`;
    document.getElementById('btn-add-prod').addEventListener('click', openAddProdModal);
  } else {
    d.innerHTML = `<button class="btn btn-primary" id="btn-add-mov">＋ Registra Movimento</button>`;
    document.getElementById('btn-add-mov').addEventListener('click', openAddMovModal);
  }
}

// ── Prodotti ──────────────────────────────
async function loadProdotti() {
  const tab = document.getElementById('tab-prodotti');
  tab.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'magazzino_prodotti'), orderBy('categoria'), orderBy('nome')));
    const prodotti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!prodotti.length) {
      tab.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">📦</span><strong>Nessun prodotto</strong><p>Aggiungi il primo articolo al magazzino.</p></div></div>';
      return;
    }

    const vini   = prodotti.filter(p => p.categoria === 'vino');
    const mat    = prodotti.filter(p => p.categoria === 'materiale');
    const totBot = vini.reduce((s, p) => s + (p.giacenza || 0), 0);
    const sottos = prodotti.filter(p => (p.giacenza || 0) < (p.giacenza_min || 0)).length;
    const vlrMag = vini.reduce((s, p) => s + (p.giacenza || 0) * (p.prezzo_listino || 0), 0);

    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-burgundy">
          <span class="kpi-icon">🍾</span>
          <div class="kpi-label">Bottiglie Vino</div>
          <div class="kpi-value">${totBot.toLocaleString('it-IT')}</div>
          <div class="kpi-sub">${vini.length} referenze</div>
        </div>
        <div class="kpi-card k-gold">
          <span class="kpi-icon">📦</span>
          <div class="kpi-label">Materiali</div>
          <div class="kpi-value">${mat.length}</div>
          <div class="kpi-sub">tipologie</div>
        </div>
        <div class="kpi-card ${sottos > 0 ? 'k-terra' : 'k-green'}">
          <span class="kpi-icon">${sottos > 0 ? '⚠️' : '✓'}</span>
          <div class="kpi-label">Sotto Scorta</div>
          <div class="kpi-value">${sottos}</div>
          <div class="kpi-sub">articoli critici</div>
        </div>
        <div class="kpi-card">
          <span class="kpi-icon">💶</span>
          <div class="kpi-label">Valore Mag. Vini</div>
          <div class="kpi-value" style="font-size:1.5rem">€ ${(vlrMag/1000).toFixed(0)}k</div>
        </div>
      </div>

      ${renderProdottiSezione('🍾 Vini', vini, prodotti)}
      <div style="margin-top:20px"></div>
      ${renderProdottiSezione('📦 Materiali', mat, prodotti)}
    `;

    tab.querySelectorAll('.btn-edit-prod').forEach(btn => {
      btn.addEventListener('click', () => openEditProdModal(prodotti.find(p => p.id === btn.dataset.id)));
    });
    tab.querySelectorAll('.btn-del-prod').forEach(btn => {
      btn.addEventListener('click', () => deleteProd(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="card"><div class="empty-state">⚠️ ${err.message}</div></div>`;
  }
}

function renderProdottiSezione(titolo, prodotti, tutti) {
  if (!prodotti.length) return '';
  return `
    <div class="card">
      <div class="card-title">${titolo}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Codice</th>
              <th>Descrizione</th>
              <th>Giacenza</th>
              <th>Scorta Min.</th>
              <th>Stato</th>
              <th>Prezzo Listino</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${prodotti.map(p => renderProdRow(p)).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderProdRow(p) {
  const critico = (p.giacenza || 0) < (p.giacenza_min || 0);
  const warn    = !critico && (p.giacenza || 0) < (p.giacenza_min || 0) * 1.5;
  const statoLabel = critico ? '<span class="badge badge-red">⚠ Critico</span>'
                   : warn    ? '<span class="badge badge-amber">Basso</span>'
                   :           '<span class="badge badge-green">OK</span>';

  return `
    <tr>
      <td><span class="td-mono">${p.codice || '—'}</span></td>
      <td class="td-bold">${p.nome || '—'}</td>
      <td>${(p.giacenza || 0).toLocaleString('it-IT')} ${p.unita || ''}</td>
      <td style="color:var(--text-muted)">${(p.giacenza_min || 0).toLocaleString('it-IT')} ${p.unita || ''}</td>
      <td>${statoLabel}</td>
      <td>€ ${p.prezzo_listino?.toFixed(2) || '—'}</td>
      <td class="td-actions">
        <button class="btn-icon btn-edit-prod" data-id="${p.id}" title="Modifica">✏️</button>
        <button class="btn-icon danger btn-del-prod" data-id="${p.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

function openAddProdModal() {
  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Nuovo Prodotto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Codice</label><input id="fp-cod" placeholder="es. BAR-2024-750"></div>
        <div class="field"><label>Categoria</label>
          <select id="fp-cat">
            <option value="vino">Vino</option>
            <option value="materiale">Materiale</option>
          </select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Descrizione</label><input id="fp-nome" placeholder="Nome prodotto…"></div>
        <div class="field"><label>Unità di misura</label>
          <select id="fp-unita">
            <option value="bottiglie">Bottiglie</option>
            <option value="pezzi">Pezzi</option>
            <option value="litri">Litri</option>
            <option value="kg">Kg</option>
          </select>
        </div>
        <div class="field"><label>Giacenza iniziale</label><input id="fp-giac" type="number" placeholder="0"></div>
        <div class="field"><label>Scorta minima</label><input id="fp-min" type="number" placeholder="0"></div>
        <div class="field"><label>Prezzo listino (€)</label><input id="fp-prezzo" type="number" step="0.01" placeholder="0.00"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-prod">Salva Prodotto</button>
    </div>
  `);

  document.getElementById('btn-save-prod').addEventListener('click', async () => {
    const nome = document.getElementById('fp-nome').value.trim();
    if (!nome) { window.showToast('Inserisci la descrizione', 'error'); return; }
    try {
      await addDoc(collection(_db, 'magazzino_prodotti'), {
        codice:         document.getElementById('fp-cod').value.trim(),
        categoria:      document.getElementById('fp-cat').value,
        nome,
        unita:          document.getElementById('fp-unita').value,
        giacenza:       parseFloat(document.getElementById('fp-giac').value) || 0,
        giacenza_min:   parseFloat(document.getElementById('fp-min').value) || 0,
        prezzo_listino: parseFloat(document.getElementById('fp-prezzo').value) || 0,
        createdAt:      Timestamp.now(),
      });
      bk.remove();
      window.showToast('Prodotto aggiunto');
      loadProdotti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

function openEditProdModal(p) {
  const unitaOpts = ['bottiglie','pezzi','litri','kg'];
  const catOpts   = ['vino','materiale'];

  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Modifica Prodotto</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Codice</label><input id="fp-cod" value="${p.codice||''}"></div>
        <div class="field"><label>Categoria</label>
          <select id="fp-cat">${catOpts.map(c=>`<option value="${c}" ${p.categoria===c?'selected':''}>${c.charAt(0).toUpperCase()+c.slice(1)}</option>`).join('')}</select>
        </div>
        <div class="field" style="grid-column:1/-1"><label>Descrizione</label><input id="fp-nome" value="${p.nome||''}"></div>
        <div class="field"><label>Unità di misura</label>
          <select id="fp-unita">${unitaOpts.map(u=>`<option ${p.unita===u?'selected':''}>${u}</option>`).join('')}</select>
        </div>
        <div class="field"><label>Giacenza attuale</label><input id="fp-giac" type="number" value="${p.giacenza||0}"></div>
        <div class="field"><label>Scorta minima</label><input id="fp-min" type="number" value="${p.giacenza_min||0}"></div>
        <div class="field"><label>Prezzo listino (€)</label><input id="fp-prezzo" type="number" step="0.01" value="${p.prezzo_listino||0}"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-prod">Salva Modifiche</button>
    </div>
  `);

  document.getElementById('btn-save-prod').addEventListener('click', async () => {
    try {
      await updateDoc(doc(_db, 'magazzino_prodotti', p.id), {
        codice:         document.getElementById('fp-cod').value.trim(),
        categoria:      document.getElementById('fp-cat').value,
        nome:           document.getElementById('fp-nome').value.trim(),
        unita:          document.getElementById('fp-unita').value,
        giacenza:       parseFloat(document.getElementById('fp-giac').value) || 0,
        giacenza_min:   parseFloat(document.getElementById('fp-min').value) || 0,
        prezzo_listino: parseFloat(document.getElementById('fp-prezzo').value) || 0,
      });
      bk.remove();
      window.showToast('Prodotto aggiornato');
      loadProdotti();
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteProd(id) {
  if (!confirm('Eliminare questo prodotto?')) return;
  try {
    await deleteDoc(doc(_db, 'magazzino_prodotti', id));
    window.showToast('Prodotto eliminato');
    loadProdotti();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}

// ── Movimenti ─────────────────────────────
async function loadMovimenti() {
  const tab = document.getElementById('tab-movimenti');
  tab.innerHTML = '<div class="card"><div class="empty-state"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);display:block;margin:0 auto"></span></div></div>';
  try {
    const snap = await getDocs(query(collection(_db, 'magazzino_movimenti'), orderBy('data', 'desc')));
    const movimenti = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (!movimenti.length) {
      tab.innerHTML = '<div class="card"><div class="empty-state"><span class="empty-icon">📋</span><strong>Nessun movimento</strong><p>Registra il primo carico o scarico.</p></div></div>';
      return;
    }

    const carichi  = movimenti.filter(m => m.tipo === 'carico').reduce((s, m) => s + (m.quantita || 0), 0);
    const scarichi = movimenti.filter(m => m.tipo === 'scarico').reduce((s, m) => s + (m.quantita || 0), 0);

    tab.innerHTML = `
      <div class="kpi-grid" style="margin-bottom:20px">
        <div class="kpi-card k-green"><span class="kpi-icon">↑</span><div class="kpi-label">Carichi Totali</div><div class="kpi-value">${carichi.toLocaleString('it-IT')}</div><div class="kpi-sub">pz / bottiglie</div></div>
        <div class="kpi-card k-burgundy"><span class="kpi-icon">↓</span><div class="kpi-label">Scarichi Totali</div><div class="kpi-value">${scarichi.toLocaleString('it-IT')}</div><div class="kpi-sub">pz / bottiglie</div></div>
        <div class="kpi-card"><span class="kpi-icon">📄</span><div class="kpi-label">Movimenti Registrati</div><div class="kpi-value">${movimenti.length}</div></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Prodotto</th>
                <th>Quantità</th>
                <th>Causale</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${movimenti.map(m => renderMovRow(m)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    tab.querySelectorAll('.btn-del-mov').forEach(btn => {
      btn.addEventListener('click', () => deleteMov(btn.dataset.id));
    });
  } catch (err) {
    tab.innerHTML = `<div class="card"><div class="empty-state">⚠️ ${err.message}</div></div>`;
  }
}

function renderMovRow(m) {
  const dateStr = m.data?.toDate?.()?.toLocaleDateString('it-IT') || '—';
  const isCarico = m.tipo === 'carico';
  return `
    <tr>
      <td style="white-space:nowrap">${dateStr}</td>
      <td><span class="badge ${isCarico ? 'badge-green' : 'badge-red'}">${isCarico ? '↑ Carico' : '↓ Scarico'}</span></td>
      <td class="td-bold">${m.prodottoNome || '—'}</td>
      <td style="font-weight:600;color:${isCarico ? 'var(--status-green)' : 'var(--status-red)'}">${isCarico ? '+' : '−'}${(m.quantita || 0).toLocaleString('it-IT')}</td>
      <td style="color:var(--text-secondary)">${m.causale || '—'}</td>
      <td class="td-actions">
        <button class="btn-icon danger btn-del-mov" data-id="${m.id}" title="Elimina">🗑</button>
      </td>
    </tr>
  `;
}

async function openAddMovModal() {
  // Carica prodotti per il selettore
  let prodotti = [];
  try {
    const snap = await getDocs(query(collection(_db, 'magazzino_prodotti'), orderBy('nome')));
    prodotti = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (_) {}

  const bk = window.openModal(`
    <div class="modal-header">
      <div class="modal-title">Registra Movimento</div>
      <button class="btn-close">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid cols-2">
        <div class="field"><label>Tipo</label>
          <select id="fm-tipo">
            <option value="carico">↑ Carico</option>
            <option value="scarico">↓ Scarico</option>
          </select>
        </div>
        <div class="field"><label>Data</label><input id="fm-data" type="date"></div>
        <div class="field" style="grid-column:1/-1"><label>Prodotto</label>
          <select id="fm-prod">
            <option value="">— Seleziona prodotto —</option>
            ${prodotti.map(p => `<option value="${p.id}" data-nome="${p.nome}" data-giac="${p.giacenza||0}">${p.nome} (giac. ${p.giacenza?.toLocaleString('it-IT')} ${p.unita})</option>`).join('')}
          </select>
        </div>
        <div class="field"><label>Quantità</label><input id="fm-qty" type="number" placeholder="0"></div>
        <div class="field" style="grid-column:1/-1"><label>Causale</label><input id="fm-caus" placeholder="es. Acquisto fornitore, Evasione ordine…"></div>
        <div class="field" style="grid-column:1/-1"><label>Note</label><textarea id="fm-note" placeholder="Note aggiuntive…" style="height:60px"></textarea></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost btn-close">Annulla</button>
      <button class="btn btn-primary" id="btn-save-mov">Registra</button>
    </div>
  `);

  document.getElementById('fm-data').value = new Date().toISOString().slice(0, 10);

  document.getElementById('btn-save-mov').addEventListener('click', async () => {
    const sel    = document.getElementById('fm-prod');
    const prodId = sel.value;
    const qty    = parseFloat(document.getElementById('fm-qty').value) || 0;
    if (!prodId)  { window.showToast('Seleziona un prodotto', 'error'); return; }
    if (qty <= 0) { window.showToast('Inserisci una quantità valida', 'error'); return; }

    const prodNome = sel.options[sel.selectedIndex].dataset.nome;
    const giacAtt  = parseFloat(sel.options[sel.selectedIndex].dataset.giac) || 0;
    const tipo     = document.getElementById('fm-tipo').value;

    if (tipo === 'scarico' && qty > giacAtt) {
      window.showToast(`Giacenza insufficiente (disponibili: ${giacAtt})`, 'error'); return;
    }

    try {
      await addDoc(collection(_db, 'magazzino_movimenti'), {
        tipo,
        prodottoId:   prodId,
        prodottoNome: prodNome,
        quantita:     qty,
        causale:      document.getElementById('fm-caus').value.trim(),
        note:         document.getElementById('fm-note').value.trim(),
        data:         Timestamp.fromDate(new Date(document.getElementById('fm-data').value)),
        createdAt:    Timestamp.now(),
      });

      // Aggiorna giacenza prodotto
      const nuovaGiac = tipo === 'carico' ? giacAtt + qty : giacAtt - qty;
      await updateDoc(doc(_db, 'magazzino_prodotti', prodId), { giacenza: nuovaGiac });

      bk.remove();
      window.showToast('Movimento registrato');
      await Promise.all([loadMovimenti(), loadProdotti()]);
    } catch (err) {
      window.showToast('Errore: ' + err.message, 'error');
    }
  });
}

async function deleteMov(id) {
  if (!confirm('Eliminare questo movimento? La giacenza NON verrà ripristinata automaticamente.')) return;
  try {
    await deleteDoc(doc(_db, 'magazzino_movimenti', id));
    window.showToast('Movimento eliminato');
    loadMovimenti();
  } catch (err) {
    window.showToast('Errore: ' + err.message, 'error');
  }
}
