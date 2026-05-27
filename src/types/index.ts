import { Timestamp } from "firebase/firestore";

// ─── Cantina ─────────────────────────────────────────────
export interface VasoVinario {
  id: string;
  nome: string;
  capacitaTotale: number;   // litri
  litriAttuali: number;
  tipoVino: string;
  note?: string;
  colore: string;           // hex per UI
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Trasferimento {
  id: string;
  daVasoId: string;
  aVasoId: string;
  litri: number;
  data: Timestamp;
  note?: string;
  utenteId: string;
}

// ─── Magazzino ────────────────────────────────────────────
export type TipoMagazzino =
  | "materiali_secchi"
  | "vetro_nudo"
  | "prodotto_finito";

export interface ArticoloMagazzino {
  id: string;
  nome: string;
  tipo: TipoMagazzino;
  quantita: number;
  unitaMisura: string;      // "pz", "kg", "m", ecc.
  sogliaMinimaAllerta?: number;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Ricette / Distinte Base ──────────────────────────────
export interface ComponenteRicetta {
  articoloId: string;
  nomeArticolo: string;
  quantitaPerBottiglia: number;
  unitaMisura: string;
}

export interface Ricetta {
  id: string;
  nome: string;
  descrizione?: string;
  tipoVino: string;
  componenti: ComponenteRicetta[];   // materiali secchi per bottiglia
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Task / Processi ──────────────────────────────────────
export type StatoTask =
  | "aperto"
  | "in_corso"
  | "completato"
  | "annullato";

export type TipoTask =
  | "imbottigliamento"
  | "etichettatura"
  | "generico";

export interface TaskImbottigliamento {
  id: string;
  tipo: "imbottigliamento";
  stato: StatoTask;
  vasoId: string;
  nomeVaso: string;
  litriPianificati: number;
  bottiglieStimate: number;
  bottiglieReali?: number;
  litriEffettivi?: number;
  // materiali scalati
  bottiglieVuoteScalate?: boolean;
  tappiScalati?: boolean;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completatoAt?: Timestamp;
  utenteId: string;
}

export interface TaskEtichettatura {
  id: string;
  tipo: "etichettatura";
  stato: StatoTask;
  ricettaId: string;
  nomeRicetta: string;
  quantitaBottiglie: number;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completatoAt?: Timestamp;
  utenteId: string;
}

export interface TaskGenerico {
  id: string;
  tipo: "generico";
  titolo: string;
  descrizione?: string;
  stato: "da_fare" | "in_corso" | "fatto";
  scadenza?: Timestamp;
  entitaCollegata?: {
    tipo: "ordine" | "imbottigliamento" | "etichettatura";
    id: string;
    label: string;
  };
  priorita: "bassa" | "media" | "alta";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  utenteId: string;
}

// ─── Clienti & Ordini ─────────────────────────────────────
export interface Cliente {
  id: string;
  ragioneSociale: string;
  email?: string;
  telefono?: string;
  indirizzo?: string;
  piva?: string;
  codiceFiscale?: string;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface RigaOrdine {
  prodottoId: string;
  nomeProdotto: string;
  quantita: number;            // bottiglie
  prezzoUnitario?: number;     // €
}

export type StatoOrdine =
  | "bozza"
  | "confermato"
  | "evaso"
  | "annullato";

export interface Ordine {
  id: string;
  clienteId: string;
  nomeCliente: string;
  righe: RigaOrdine[];
  stato: StatoOrdine;
  dataOrdine: Timestamp;
  dataEvasione?: Timestamp;
  note?: string;
  totaleBottiglie: number;
  totaleValore?: number;
  utenteId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Auth ─────────────────────────────────────────────────
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}
