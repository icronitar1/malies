import { auth, db } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection, getDocs, addDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ── PWA Service Worker ────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

// ── DOM refs ──────────────────────────────
const loadingScreen  = document.getElementById('loading-screen');
const loginScreen    = document.getElementById('login-screen');
const appShell       = document.getElementById('app-shell');
const loginEmail     = document.getElementById('login-email');
const loginPassword  = document.getElementById('login-password');
const loginBtn       = document.getElementById('login-btn');
const loginError     = document.getElementById('login-error');
const logoutBtn      = document.getElementById('logout-btn');
const navMenu        = document.getElementById('nav-menu');
const moduleContainer = document.getElementById('module-container');
const navToggle      = document.getElementById('nav-toggle');
const sidebar        = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

// ── State ─────────────────────────────────
let currentModule = null;
let currentModuleCleanup = null;

// ── Auth state ────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    document.getElementById('user-name').textContent = user.email.split('@')[0];
    document.getElementById('user-avatar').textContent =
      user.email.charAt(0).toUpperCase();
    await seedDataIfNeeded();
    showApp();
    loadModule('dashboard');
  } else {
    showLogin();
  }
  hideSplash();
});

// ── Login ─────────────────────────────────
loginBtn.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pwd   = loginPassword.value;
  if (!email || !pwd) return showLoginError('Inserisci email e password.');

  loginBtn.disabled = true;
  loginBtn.textContent = 'Accesso in corso…';
  loginError.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, pwd);
  } catch (e) {
    const msgs = {
      'auth/user-not-found':  'Utente non trovato.',
      'auth/wrong-password':  'Password errata.',
      'auth/invalid-email':   'Email non valida.',
      'auth/too-many-requests': 'Troppi tentativi. Riprova più tardi.',
    };
    showLoginError(msgs[e.code] || 'Errore di accesso. Controlla le credenziali.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Accedi';
  }
});

loginPassword.addEventListener('keydown', e => {
  if (e.key === 'Enter') loginBtn.click();
});

// ── Logout ────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
});

// ── Routing ───────────────────────────────
navMenu.addEventListener('click', e => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  const mod = item.dataset.module;
  if (mod === currentModule) {
    closeMobileNav(); return;
  }
  navMenu.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  item.classList.add('active');
  loadModule(mod);
  closeMobileNav();
});

async function loadModule(name) {
  currentModule = name;
  moduleContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)"><div class="spinner" style="border-color:rgba(124,29,46,0.2);border-top-color:var(--burgundy);margin:0 auto"></div></div>';

  if (currentModuleCleanup) { currentModuleCleanup(); currentModuleCleanup = null; }

  try {
    const mod = await import(`./modules/${name}.js`);
    currentModuleCleanup = await mod.init(moduleContainer, db) || null;
  } catch (err) {
    console.error('Errore caricamento modulo:', err);
    moduleContainer.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><strong>Errore caricamento modulo</strong><p>${err.message}</p></div>`;
  }
}

// ── Mobile nav ────────────────────────────
navToggle.addEventListener('click', () => {
  sidebar.classList.toggle('open');
  sidebarOverlay.classList.toggle('open');
});
sidebarOverlay.addEventListener('click', closeMobileNav);
function closeMobileNav() {
  sidebar.classList.remove('open');
  sidebarOverlay.classList.remove('open');
}

// ── UI Helpers ────────────────────────────
function hideSplash() {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => loadingScreen.classList.add('hidden'), 500);
}
function showLogin() {
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
}
function showApp() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
}
function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.remove('hidden');
}

// ── Global Toast ──────────────────────────
export function showToast(msg, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
window.showToast = showToast;

// ── Global Modal Helpers ──────────────────
export function openModal(html) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('.btn-close')?.addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  return backdrop;
}
window.openModal = openModal;

// ── Seed Data ─────────────────────────────
async function seedDataIfNeeded() {
  try {
    const snap = await getDocs(collection(db, 'cantina_lotti'));
    if (!snap.empty) return; // già popolato
    await seedAll();
  } catch (e) {
    console.warn('Seed saltato:', e.message);
  }
}

async function seedAll() {
  const now = Timestamp.now();
  const ts = (y, m, d) => Timestamp.fromDate(new Date(y, m - 1, d));

  // ── Cantina: Lotti
  const lotti = [
    { nome: 'Barolo DOCG 2021', vitigno: 'Nebbiolo', annata: 2021, litri: 15000, stato: 'affinamento', vasca: 'A1', note: 'Fermentazione completata, in barrique', dataInizio: ts(2021,10,15), createdAt: now },
    { nome: 'Barbera d\'Asti DOC 2022', vitigno: 'Barbera', annata: 2022, litri: 8000, stato: 'pronto', vasca: 'B2', note: 'Pronto per imbottigliamento', dataInizio: ts(2022,10,10), createdAt: now },
    { nome: 'Moscato d\'Asti DOCG 2023', vitigno: 'Moscato Bianco', annata: 2023, litri: 5000, stato: 'fermentazione', vasca: 'C1', note: 'Prima fermentazione in corso', dataInizio: ts(2023,9,20), createdAt: now },
    { nome: 'Barolo DOCG 2020', vitigno: 'Nebbiolo', annata: 2020, litri: 12000, stato: 'imbottigliato', vasca: '—', note: 'Imbottigliamento completato Marzo 2023', dataInizio: ts(2020,10,18), createdAt: now },
  ];
  for (const l of lotti) await addDoc(collection(db, 'cantina_lotti'), l);

  // ── Cantina: Vasche
  const vasche = [
    { codice: 'A1', tipo: 'cemento',     capacita: 20000, stato: 'occupata',    lottoNome: 'Barolo DOCG 2021' },
    { codice: 'A2', tipo: 'acciaio',     capacita: 15000, stato: 'libera',      lottoNome: '' },
    { codice: 'B1', tipo: 'acciaio',     capacita: 10000, stato: 'libera',      lottoNome: '' },
    { codice: 'B2', tipo: 'acciaio',     capacita: 10000, stato: 'occupata',    lottoNome: 'Barbera d\'Asti DOC 2022' },
    { codice: 'C1', tipo: 'vetroresina', capacita: 8000,  stato: 'occupata',    lottoNome: 'Moscato d\'Asti DOCG 2023' },
    { codice: 'C2', tipo: 'legno',       capacita: 5000,  stato: 'manutenzione', lottoNome: '' },
  ];
  for (const v of vasche) await addDoc(collection(db, 'cantina_vasche'), { ...v, createdAt: now });

  // ── Campagna: Vigneti
  const vigneti = [
    { nome: 'Vigna Alta', ettari: 5.0, vitigno: 'Nebbiolo', comune: 'Guardia Sanframondi', anno_impianto: 1985, esposizione: 'Sud-Est', altitudine: 320, denominazione: 'Sannio DOC', note: 'Viti storiche, bassa resa, alta qualità' },
    { nome: 'Vigna del Poggio', ettari: 3.2, vitigno: 'Aglianico', comune: 'Guardia Sanframondi', anno_impianto: 1998, esposizione: 'Sud', altitudine: 280, denominazione: 'Aglianico del Taburno DOCG', note: '' },
    { nome: 'Campo Grande', ettari: 4.5, vitigno: 'Falanghina', comune: 'San Lorenzello', anno_impianto: 2005, esposizione: 'Est', altitudine: 260, denominazione: 'Falanghina del Sannio DOC', note: 'Vigneto giovane, buone rese' },
    { nome: 'Rupe Rossa', ettari: 2.1, vitigno: 'Greco', comune: 'Telese Terme', anno_impianto: 2010, esposizione: 'Sud-Ovest', altitudine: 190, denominazione: 'Sannio DOC', note: 'Terreno calcareo, aromi intensi' },
  ];
  for (const v of vigneti) await addDoc(collection(db, 'campagna_vigneti'), { ...v, createdAt: now });

  // ── Campagna: Attività
  const attivita = [
    { tipo: 'potatura', vigna: 'Vigna Alta',     data: ts(2024,2,10), operatori: 4, ore: 32, note: 'Potatura Guyot completata', prodotti: '' },
    { tipo: 'trattamento', vigna: 'Campo Grande', data: ts(2024,4,22), operatori: 2, ore: 6, note: 'Antiperonosporico preventivo', prodotti: 'Peronosol Cu 2kg/ha' },
    { tipo: 'concimazione', vigna: 'Vigna del Poggio', data: ts(2024,3,15), operatori: 2, ore: 4, note: 'Concimazione organica primaverile', prodotti: 'Humus 3t/ha' },
    { tipo: 'vendemmia', vigna: 'Vigna Alta',    data: ts(2023,10,5), operatori: 8, ore: 40, note: 'Vendemmia manuale, ottima maturazione', prodotti: '' },
    { tipo: 'vendemmia', vigna: 'Campo Grande',  data: ts(2023,9,22), operatori: 6, ore: 24, note: 'Raccolta anticipata per freschezza', prodotti: '' },
  ];
  for (const a of attivita) await addDoc(collection(db, 'campagna_attivita'), { ...a, createdAt: now });

  // ── Magazzino: Prodotti
  const prodotti = [
    { codice: 'BAR-2020-750', nome: 'Barolo DOCG 2020 — 750ml', categoria: 'vino', unita: 'bottiglie', giacenza: 3200, giacenza_min: 500, prezzo_listino: 38.00 },
    { codice: 'AGL-2021-750', nome: 'Aglianico del Taburno 2021 — 750ml', categoria: 'vino', unita: 'bottiglie', giacenza: 5800, giacenza_min: 800, prezzo_listino: 18.00 },
    { codice: 'FAL-2022-750', nome: 'Falanghina del Sannio 2022 — 750ml', categoria: 'vino', unita: 'bottiglie', giacenza: 4200, giacenza_min: 600, prezzo_listino: 12.00 },
    { codice: 'GRE-2022-750', nome: 'Greco del Sannio 2022 — 750ml', categoria: 'vino', unita: 'bottiglie', giacenza: 2100, giacenza_min: 400, prezzo_listino: 14.00 },
    { codice: 'TAP-SUG-45',  nome: 'Tappi sughero naturale ⌀45', categoria: 'materiale', unita: 'pezzi', giacenza: 14000, giacenza_min: 2000, prezzo_listino: 0.28 },
    { codice: 'ETI-BAR',     nome: 'Etichette Barolo DOCG', categoria: 'materiale', unita: 'pezzi', giacenza: 4800, giacenza_min: 1000, prezzo_listino: 0.15 },
    { codice: 'CAP-NEG',     nome: 'Capsule termoretraibili nere', categoria: 'materiale', unita: 'pezzi', giacenza: 9500, giacenza_min: 1500, prezzo_listino: 0.08 },
    { codice: 'CAR-6',       nome: 'Cartoni da 6 bottiglie', categoria: 'materiale', unita: 'pezzi', giacenza: 2200, giacenza_min: 300, prezzo_listino: 1.20 },
  ];
  for (const p of prodotti) await addDoc(collection(db, 'magazzino_prodotti'), { ...p, createdAt: now });

  // ── Magazzino: Movimenti
  const movimenti = [
    { tipo: 'carico', prodottoNome: 'Barolo DOCG 2020 — 750ml', quantita: 4000, causale: 'Imbottigliamento lotto 2020', data: ts(2023,3,15) },
    { tipo: 'scarico', prodottoNome: 'Barolo DOCG 2020 — 750ml', quantita: 800, causale: 'Evasione ordine ORD-2024-001/002', data: ts(2024,4,20) },
    { tipo: 'carico', prodottoNome: 'Aglianico del Taburno 2021 — 750ml', quantita: 6200, causale: 'Imbottigliamento lotto Aglianico', data: ts(2023,5,10) },
    { tipo: 'scarico', prodottoNome: 'Falanghina del Sannio 2022 — 750ml', quantita: 360, causale: 'Evasione ordine ORD-2024-003', data: ts(2024,5,2) },
    { tipo: 'carico', prodottoNome: 'Tappi sughero naturale ⌀45', quantita: 15000, causale: 'Acquisto fornitore', data: ts(2024,1,8) },
  ];
  for (const m of movimenti) await addDoc(collection(db, 'magazzino_movimenti'), { ...m, createdAt: now });

  // ── Commerciale: Clienti
  const clienti = [
    { ragione_sociale: 'Enoteca Borghese', tipo: 'enoteca', piva: 'IT08765432101', email: 'acquisti@enotecaborghese.it', telefono: '06 4891234', indirizzo: 'Via del Corso 88', citta: 'Roma', paese: 'Italia', listino: 'B', note: 'Cliente storico, pagamento 30gg' },
    { ragione_sociale: 'Ristorante Il Sannio', tipo: 'horeca', piva: 'IT05432167890', email: 'info@ristorantesannio.it', telefono: '0824 234567', indirizzo: 'Corso Garibaldi 42', citta: 'Benevento', paese: 'Italia', listino: 'A', note: 'Ordini mensili regolari' },
    { ragione_sociale: 'Vineria del Centro', tipo: 'enoteca', piva: 'IT01122334455', email: 'ordini@vineriacentro.it', telefono: '055 987654', indirizzo: 'Via Tornabuoni 12', citta: 'Firenze', paese: 'Italia', listino: 'B', note: '' },
    { ragione_sociale: 'Mediterranean Wines Ltd', tipo: 'export', piva: 'GB123456789', email: 'buying@medwines.co.uk', telefono: '+44 20 7890 1234', indirizzo: '14 Borough Market Ln', citta: 'Londra', paese: 'Regno Unito', listino: 'C', note: 'Export, pagamento anticipato, incoterm CIF' },
    { ragione_sociale: 'Hotel Palazzo Vecchio', tipo: 'horeca', piva: 'IT09988776655', email: 'fb@palazzovecchio.it', telefono: '055 567890', indirizzo: 'Piazza della Signoria 6', citta: 'Firenze', paese: 'Italia', listino: 'A', note: 'Carta vini stagionale' },
  ];
  for (const c of clienti) await addDoc(collection(db, 'commerciale_clienti'), { ...c, createdAt: now });

  // ── Commerciale: Ordini
  const ordini = [
    {
      numero: 'ORD-2024-001',
      clienteNome: 'Enoteca Borghese',
      data: ts(2024,4,15),
      stato: 'spedito',
      righe: [
        { prodottoNome: 'Barolo DOCG 2020 — 750ml', quantita: 120, prezzo: 38.00 },
        { prodottoNome: 'Falanghina del Sannio 2022 — 750ml', quantita: 60, prezzo: 12.00 },
      ],
      totale: 5280.00,
      note: 'Spedito con BRT il 18/04'
    },
    {
      numero: 'ORD-2024-002',
      clienteNome: 'Mediterranean Wines Ltd',
      data: ts(2024,4,20),
      stato: 'confermato',
      righe: [
        { prodottoNome: 'Aglianico del Taburno 2021 — 750ml', quantita: 240, prezzo: 18.00 },
      ],
      totale: 4320.00,
      note: 'Export UK, attesa pagamento anticipato'
    },
    {
      numero: 'ORD-2024-003',
      clienteNome: 'Ristorante Il Sannio',
      data: ts(2024,5,2),
      stato: 'in_preparazione',
      righe: [
        { prodottoNome: 'Falanghina del Sannio 2022 — 750ml', quantita: 36, prezzo: 11.00 },
        { prodottoNome: 'Greco del Sannio 2022 — 750ml', quantita: 24, prezzo: 13.00 },
      ],
      totale: 708.00,
      note: ''
    },
    {
      numero: 'ORD-2024-004',
      clienteNome: 'Vineria del Centro',
      data: ts(2024,5,5),
      stato: 'bozza',
      righe: [
        { prodottoNome: 'Barolo DOCG 2020 — 750ml', quantita: 48, prezzo: 35.00 },
      ],
      totale: 1680.00,
      note: 'In attesa conferma cliente'
    },
  ];
  for (const o of ordini) await addDoc(collection(db, 'commerciale_ordini'), { ...o, createdAt: now });

  console.log('✅ Seed dati completato');
}
