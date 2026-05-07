# 🍷 Gestionale di Malies — Vigne di Malies

PWA gestionale aziendale per cantina vinicola.
Firebase Hosting + Firestore + Auth. Nessun bundler, JS moduli nativi.

---

## 📁 Struttura File

```
malies/
├── firebase.json              ← configurazione hosting Firebase
├── firestore.rules            ← regole sicurezza Firestore
├── firestore.indexes.json     ← indici Firestore
└── public/
    ├── index.html             ← shell HTML + login
    ├── style.css              ← design system completo
    ├── app.js                 ← entry point: auth, routing, seed data
    ├── firebase-config.js     ← inizializzazione Firebase
    ├── manifest.json          ← PWA manifest
    ├── sw.js                  ← Service Worker (offline)
    ├── icons/
    │   ├── icon-192.png       ← da creare (vedi sotto)
    │   └── icon-512.png       ← da creare (vedi sotto)
    └── modules/
        ├── dashboard.js       ← panoramica KPI e attività
        ├── cantina.js         ← lotti vinificazione + vasche
        ├── campagna.js        ← vigneti + attività agricole
        ├── magazzino.js       ← giacenze + movimenti
        └── commerciale.js     ← clienti + ordini
```

---

## 🚀 Deploy su Firebase Hosting

### 1. Installa Firebase CLI (una tantum)
```bash
npm install -g firebase-tools
firebase login
```

### 2. Collega il progetto
```bash
cd malies/
firebase use malies-8e5ce
```

### 3. Crea le icone PWA (necessario)
Crea due immagini PNG con il logo della cantina:
- `public/icons/icon-192.png` (192×192 px)
- `public/icons/icon-512.png` (512×512 px)

Puoi usare un tool online come https://favicon.io o realizzarle in qualsiasi editor grafico.

### 4. Deploy completo
```bash
firebase deploy
```

Oppure solo l'hosting:
```bash
firebase deploy --only hosting
```

Oppure regole + indici:
```bash
firebase deploy --only firestore:rules,firestore:indexes
```

---

## 👤 Creare il primo utente

Dal pannello Firebase Console → Authentication → Users → "Add User":
- Email: tuo indirizzo email
- Password: scegli una password sicura

---

## 📱 Installare come PWA

**Android (Chrome):**
1. Apri il sito nel browser
2. Menu ⋮ → "Aggiungi a schermata Home"

**iOS (Safari):**
1. Apri il sito in Safari
2. Tocca il pulsante Condividi
3. "Aggiungi alla schermata Home"

---

## 🗃 Collezioni Firestore create automaticamente

Al primo accesso l'app popola automaticamente i dati demo:

| Collezione               | Contenuto                           |
|--------------------------|-------------------------------------|
| `cantina_lotti`          | 4 lotti di vinificazione            |
| `cantina_vasche`         | 6 vasche (acciaio, cemento, legno…) |
| `campagna_vigneti`       | 4 vigneti (Sannio, BN)              |
| `campagna_attivita`      | 5 attività agricole                 |
| `magazzino_prodotti`     | 8 prodotti (vini + materiali)       |
| `magazzino_movimenti`    | 5 movimenti carico/scarico          |
| `commerciale_clienti`    | 5 clienti (enoteche, horeca, export)|
| `commerciale_ordini`     | 4 ordini in vari stati              |

---

## 🔐 Sicurezza

Le regole Firestore (`firestore.rules`) consentono lettura/scrittura
**solo a utenti autenticati**. Nessun dato è pubblicamente accessibile.

Per ambienti di produzione con più ruoli utente, valuta l'aggiunta di
custom claims Firebase per gestire permessi granulari per modulo.
