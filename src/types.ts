export interface Tank {
  id: string;
  name: string;
  capacity: number;
  currentLiters: number;
  wineType: string;
  ph?: number;
  so2?: number;
  alcohol?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'MATERIALE_SECCO' | 'VETRO_NUDO' | 'PRODOTTO_FINITO';
  quantity: number;
  unit: string;
}

export interface BottlingProcess {
  id: string;
  tankId: string;
  tankName: string;
  wineType: string;
  litersUsed: number;
  estimatedBottles: number;
  actualBottles?: number;
  status: 'IN_CORSO' | 'COMPLETATO';
  dateStarted: string;
  dateCompleted?: string;
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
}

export interface Order {
  id: string;
  clientId: string;
  clientName: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'EVASO';
}

export interface TodoTask {
  id: string;
  title: string;
  dueDate?: string;
  status: 'DA_FARE' | 'IN_CORSO' | 'COMPLETATO';
  relatedEntityId?: string;
  relatedEntityType?: 'IMBOTTIGLIAMENTO' | 'ORDINE' | 'ETICHETTATURA';
  relatedEntityName?: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export type ActiveArea = 'HUB' | 'CAMPAGNA' | 'CANTINA' | 'MAGAZZINO' | 'VENDITE' | 'TODO';
