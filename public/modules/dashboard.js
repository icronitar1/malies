import {
  collection, getDocs, query, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

export async function init(container, db) {
  const now = new Date();
  const greetings = ['Buongiorno', 'Buongiorno', 'Buongiorno', 'Buon pomeriggio', 'Buon pomeriggio', 'Buona sera', 'Buona sera'];
  const greeting = greetings[Math.min(Math.floor(now.getHours() / 4), 6)];
  const dateStr = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  container.innerHTML = `
    <div class="dash-welcome">
      <div class="dash-greeting">${greeting} — ${dateStr}</div>
      <h2>Benvenuto nel Gestionale di Malies</h2>
      <p>Panoramica operativa di Vigne di Malies</p>
    </div>
    <div class="kpi-grid" id="kpi-grid">
      ${['','','',''].map(() => `<div class="kpi-card"><div class="kpi-label">Caricamento…</div><div class="kpi-value">—</div></div>`).join('')}
    </div>
    <div class="content-grid">
      <div class="card" id="attivita-card">
        <div class="card-title">🕐 Attività Recenti</div>
        <div class="activity-list" id="activity-list">
          <div class="empty-state" style="padding:20px"><span class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);margin:0 auto;display:block"></span></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px">
        <div class="card">
          <div class="card-title">🏛 Vasche Cantina</div>
          <div id="vasca-summary"></div>
        </div>
        <div class="card">
          <div class="card-title">📋 Ordini Aperti</div>
          <div id="ordini-summary"></div>
        </div>
      </div>
    </div>
  `;

  // KPI data
  try {
    const [lottiSnap, prodSnap, ordSnap, vigSnap] = await Promise.all([
      getDocs(collection(db, 'cantina_lotti')),
      getDocs(collection(db, 'magazzino_prodotti')),
      getDocs(collection(db, 'commerciale_ordini')),
      getDocs(collection(db, 'campagna_vigneti')),
    ]);

    const lotti = lottiSnap.docs.map(d => d.data());
    const prodotti = prodSnap.docs.map(d => d.data());
    const ordini = ordSnap.docs.map(d => d.data());
    const vigneti = vigSnap.docs.map(d => d.data());

    const litriCantina = lotti.filter(l => l.stato !== 'imbottigliato').reduce((s, l) => s + (l.litri || 0), 0);
    const bottiglie = prodotti.filter(p => p.categoria === 'vino').reduce((s, p) => s + (p.giacenza || 0), 0);
    const ordAperti = ordini.filter(o => !['spedito','consegnato','annullato'].includes(o.stato)).length;
    const ettari = vigneti.reduce((s, v) => s + (v.ettari || 0), 0);

    document.getElementById('kpi-grid').innerHTML = `
      <div class="kpi-card k-burgundy">
        <span class="kpi-icon">🏛</span>
        <div class="kpi-label">Litri in Cantina</div>
        <div class="kpi-value">${litriCantina.toLocaleString('it-IT')}</div>
        <div class="kpi-sub">${lotti.filter(l=>l.stato!=='imbottigliato').length} lotti attivi</div>
      </div>
      <div class="kpi-card k-gold">
        <span class="kpi-icon">🍾</span>
        <div class="kpi-label">Bottiglie a Magazzino</div>
        <div class="kpi-value">${bottiglie.toLocaleString('it-IT')}</div>
        <div class="kpi-sub">${prodotti.filter(p=>p.categoria==='vino').length} referenze vino</div>
      </div>
      <div class="kpi-card k-terra">
        <span class="kpi-icon">📋</span>
        <div class="kpi-label">Ordini Aperti</div>
        <div class="kpi-value">${ordAperti}</div>
        <div class="kpi-sub">su ${ordini.length} totali</div>
      </div>
      <div class="kpi-card k-green">
        <span class="kpi-icon">🌿</span>
        <div class="kpi-label">Ettari in Produzione</div>
        <div class="kpi-value">${ettari.toFixed(1)}</div>
        <div class="kpi-sub">${vigneti.length} vigneti</div>
      </div>
    `;

    // Attività recenti (misto)
    const attSnap = await getDocs(query(collection(db, 'campagna_attivita'), orderBy('data', 'desc'), limit(3)));
    const movSnap = await getDocs(query(collection(db, 'magazzino_movimenti'), orderBy('data', 'desc'), limit(2)));

    const events = [
      ...attSnap.docs.map(d => ({ ...d.data(), _tipo: 'campagna' })),
      ...movSnap.docs.map(d => ({ ...d.data(), _tipo: 'magazzino' })),
      ...lotti.slice(0,2).map(l => ({ ...l, _tipo: 'cantina' })),
      ...ordini.slice(0,2).map(o => ({ ...o, _tipo: 'commerciale' })),
    ].sort((a, b) => {
      const ta = a.data?.toDate?.() || a.dataInizio?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
      const tb = b.data?.toDate?.() || b.dataInizio?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
      return tb - ta;
    }).slice(0, 8);

    document.getElementById('activity-list').innerHTML = events.length
      ? events.map(ev => renderActivity(ev)).join('')
      : '<div class="empty-state" style="padding:16px"><span class="empty-icon">📭</span>Nessuna attività recente</div>';

    // Vasche summary
    const vascheSnap = await getDocs(collection(db, 'cantina_vasche'));
    const vasche = vascheSnap.docs.map(d => d.data());
    const libere = vasche.filter(v => v.stato === 'libera').length;
    document.getElementById('vasca-summary').innerHTML = `
      ${vasche.map(v => `
        <div class="stat-row">
          <span class="stat-label"><strong>${v.codice}</strong> · ${v.tipo}</span>
          <span class="stat-value" style="display:flex;align-items:center;gap:8px">
            ${v.lottoNome ? `<span style="font-size:0.75rem;color:var(--burgundy);font-weight:500">${v.lottoNome.split(' ').slice(0,2).join(' ')}</span>` : ''}
            <span class="badge ${v.stato === 'libera' ? 'badge-green' : v.stato === 'manutenzione' ? 'badge-amber' : 'badge-blue'}">${v.stato}</span>
          </span>
        </div>
      `).join('')}
      <div class="mt-8" style="font-size:0.78rem;color:var(--text-muted)">${libere} vasche libere su ${vasche.length}</div>
    `;

    // Ordini summary
    const statLabel = { bozza:'badge-grey', confermato:'badge-blue', in_preparazione:'badge-amber', spedito:'badge-green', consegnato:'badge-green', annullato:'badge-red' };
    document.getElementById('ordini-summary').innerHTML = ordini.slice(0,4).map(o => `
      <div class="stat-row">
        <span class="stat-label">
          <strong>${o.numero}</strong><br>
          <span style="font-size:0.75rem">${o.clienteNome}</span>
        </span>
        <span class="stat-value" style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span class="badge ${statLabel[o.stato] || 'badge-grey'}">${o.stato.replace('_',' ')}</span>
          <span style="font-size:0.78rem">€ ${o.totale?.toLocaleString('it-IT',{minimumFractionDigits:2})}</span>
        </span>
      </div>
    `).join('') || '<div class="empty-state" style="padding:12px">Nessun ordine</div>';

  } catch (err) {
    console.error('Dashboard error:', err);
    document.getElementById('kpi-grid').innerHTML = `<div class="empty-state full-width" style="grid-column:1/-1"><span class="empty-icon">⚠️</span>Errore caricamento dati<p>${err.message}</p></div>`;
  }
}

function renderActivity(ev) {
  const tipo = ev._tipo;
  const dateObj = ev.data?.toDate?.() || ev.dataInizio?.toDate?.() || ev.createdAt?.toDate?.() || null;
  const dateStr = dateObj ? dateObj.toLocaleDateString('it-IT', { day:'numeric', month:'short' }) : '';

  const labels = {
    campagna:    `Campagna — ${ev.tipo || ''}: ${ev.vigna || ''}`,
    magazzino:   `Magazzino — ${ev.tipo === 'carico' ? '↑ Carico' : '↓ Scarico'}: ${ev.prodottoNome || ''} (${ev.quantita} pz)`,
    cantina:     `Cantina — Lotto: ${ev.nome || ''} · ${ev.litri?.toLocaleString('it-IT')} L`,
    commerciale: `Commerciale — ${ev.numero || ''}: ${ev.clienteNome || ''} (€ ${ev.totale?.toLocaleString('it-IT',{minimumFractionDigits:2})})`,
  };

  return `
    <div class="activity-item">
      <div class="activity-dot ${tipo}"></div>
      <div>
        <div class="activity-text">${labels[tipo] || ''}</div>
        <div class="activity-meta">${dateStr}${ev.note ? ' · ' + ev.note.slice(0,60) : ''}</div>
      </div>
    </div>
  `;
}
