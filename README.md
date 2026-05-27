# 🍷 Vigne di Malies — Gestionale Vitivinicolo

Gestionale completo per la cantina Vigne di Malies, costruito con React + TypeScript + Firebase.

## Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: Tailwind CSS (tema personalizzato vino/terracotta), Lucide Icons
- **Backend**: Firebase (Firestore + Auth)

## Setup rapido

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia in development
npm run dev

# 3. Build per produzione
npm run build
```

L'app sarà disponibile su `http://localhost:5173`

## Struttura Firestore

| Collezione | Descrizione |
|---|---|
| `vasi_vinari` | Serbatoi/vasche della cantina |
| `trasferimenti` | Log dei trasferimenti tra vasi |
| `magazzino` | Tutti gli articoli (materiali_secchi, vetro_nudo, prodotto_finito) |
| `ricette` | Distinte base per l'etichettatura |
| `task_imbottigliamento` | Task di imbottigliamento (Fase A) |
| `task_etichettatura` | Task di etichettatura (Fase B) |
| `clienti` | Anagrafica clienti |
| `ordini` | Ordini di vendita |
| `task_generici` | Task manager / cose da fare |

## Moduli

- **Dashboard** — panoramica litri, scorte, ordini aperti
- **Cantina & Vasi** — mappatura vasi, trasferimenti, avvio imbottigliamento
- **Magazzino** — materiali secchi, vetro nudo, prodotto finito
- **Produzione** — gestione task imbottigliamento + etichettatura con distinte base
- **Vendite & Ordini** — clienti, ordini, evasione automatica scorte
- **Cose da Fare** — task manager con collegamento a entità del gestionale
- **Gestione Vigneto** — placeholder (sviluppo futuro)

## Regole Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
