import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  doc, 
  getDocs
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  Wine, 
  Package, 
  ListTodo, 
  ShoppingCart, 
  Leaf, 
  Plus, 
  Check, 
  Trash2, 
  Loader2, 
  Users, 
  Tag, 
  Sliders,
  X,
  Menu,
  ChevronLeft,
  Home,
  FileText,
  Activity
} from 'lucide-react';

// ==========================================
// 1. CONFIGURAZIONE FIREBASE & UTILS
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyB6b-rpI1sfk36hD2y3uLJmD12hF-huZZ0",
  authDomain: "malies-8e5ce.firebaseapp.com",
  projectId: "malies-8e5ce",
  storageBucket: "malies-8e5ce.firebasestorage.app",
  messagingSenderId: "154236719414",
  appId: "1:154236719414:web:f5cee481f3429d69d7e397",
  measurementId: "G-PKLTWHFHLJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof (window as any).__app_id !== 'undefined' ? (window as any).__app_id : 'vigne-di-malies-v2';

const getCollectionPath = (collectionName: string) => {
  return `artifacts/${appId}/public/data/${collectionName}`;
};

// Funzione di utilità per renderizzare in modo sicuro le date provenienti da Firestore
const renderDate = (dateVal: any): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'object' && dateVal.seconds !== undefined) {
    return new Date(dateVal.seconds * 1000).toLocaleDateString('it-IT');
  }
  if (dateVal instanceof Date) {
    return dateVal.toLocaleDateString('it-IT');
  }
  return String(dateVal);
};

// ==========================================
// 2. INTERFACCE DATI (TYPESCRIPT)
// ==========================================
interface Tank {
  id: string;
  name: string;
  capacity: number;
  currentLiters: number;
  wineType: string;
  ph?: number;
  so2?: number; 
  alcohol?: number; 
}

interface InventoryItem {
  id: string;
  name: string;
  category: 'MATERIALE_SECCO' | 'VETRO_NUDO' | 'PRODOTTO_FINITO';
  quantity: number;
  unit: string;
}

interface BottlingProcess {
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

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
}

interface Order {
  id: string;
  clientId: string;
  clientName: string;
  productName: string;
  quantity: number;
  date: string;
  status: 'EVASO';
}

interface TodoTask {
  id: string;
  title: string;
  dueDate?: string;
  status: 'DA_FARE' | 'IN_CORSO' | 'COMPLETATO';
  relatedEntityId?: string;
  relatedEntityType?: 'IMBOTTIGLIAMENTO' | 'ORDINE' | 'ETICHETTATURA';
  relatedEntityName?: string;
}

interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type ActiveArea = 'HUB' | 'CAMPAGNA' | 'CANTINA' | 'MAGAZZINO' | 'VENDITE' | 'TODO';

// ==========================================
// 3. COMPONENTE PRINCIPALE (APP)
// ==========================================
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeArea, setActiveArea] = useState<ActiveArea>('HUB');
  
  // Sub-vedute per area
  const [cantinaSubView, setCantinaSubView] = useState<'SERBATOI' | 'ANALISI_STORICO'>('SERBATOI');
  const [magazzinoSubView, setMagazzinoSubView] = useState<'INVENTARIO' | 'PROCESSI_ATTIVI'>('INVENTARIO');
  const [venditeSubView, setVenditeSubView] = useState<'CLIENTI' | 'ORDINI'>('CLIENTI');
  const [todoSubView, setTodoSubView] = useState<'ATTIVI' | 'COMPLETATI'>('ATTIVI');

  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Stati per le NOTIFICHE toast personalizzate
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Stati per le collezioni dati
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bottlings, setBottlings] = useState<BottlingProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [todos, setTodos] = useState<TodoTask[]>([]);

  // Stati per form ed editing
  const [isAddingTank, setIsAddingTank] = useState(false);
  const [newTank, setNewTank] = useState({ name: '', capacity: 2000, currentLiters: 1000, wineType: '' });
  
  const [activeAnalysisTank, setActiveAnalysisTank] = useState<Tank | null>(null);
  const [analysisData, setAnalysisData] = useState({ ph: '', so2: '', alcohol: '' });

  const [activeBottlingTank, setActiveBottlingTank] = useState<Tank | null>(null);
  const [bottlingLiters, setBottlingLiters] = useState<number>(0);

  const [activeCompleteBottling, setActiveCompleteBottling] = useState<BottlingProcess | null>(null);
  const [actualBottlesCount, setActualBottlesCount] = useState<number>(0);

  const [isLabelingModalOpen, setIsLabelingModalOpen] = useState(false);
  const [labelingSource, setLabelingSource] = useState('');
  const [labelingQty, setLabelingQty] = useState(0);
  const [labelingRecipe, setLabelingRecipe] = useState('Linea Classica Malies');

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: 'MATERIALE_SECCO' as any, quantity: 0, unit: 'pz' });

  const [isAddingClient, setIsAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', city: '' });

  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [newOrder, setNewOrder] = useState({ clientId: '', productId: '', quantity: 1 });

  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [newTodo, setNewTodo] = useState({ title: '', dueDate: '', relatedEntityId: '', relatedEntityType: '' as any });

  // Iniezione programmatica degli stili e delle animazioni personalizzate per evitare importazioni esterne non risolvibili
  useEffect(() => {
    const styleId = 'custom-gestionale-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Mostra una notifica personalizzata
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // 3.1. INIZIALIZZAZIONE AUTH
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) {
          await signInWithCustomToken(auth, (window as any).__initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error: any) {
        console.error("Autenticazione fallita:", error);
        showToast("Accesso limitato dal server. Funzionamento in modalità locale / simulata attiva.", "info");
        setUser({ uid: 'local-demo-user', isAnonymous: true } as any);
        setLoading(false);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        initializeDefaultData();
      }
    });

    return () => unsubscribe();
  }, []);

  // 3.2. SINCRONIZZAZIONE DATI FIRESTORE
  useEffect(() => {
    if (!user || user.uid === 'local-demo-user') {
      if (user?.uid === 'local-demo-user') {
        setLoading(false);
      }
      return;
    }

    const unsubTanks = onSnapshot(
      collection(db, getCollectionPath('tanks')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tank));
        setTanks(data);
        setLoading(false);
      },
      (err) => console.error("Errore lettura Tanks:", err)
    );

    const unsubInventory = onSnapshot(
      collection(db, getCollectionPath('inventory')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
        setInventory(data);
      },
      (err) => console.error("Errore lettura Inventory:", err)
    );

    const unsubBottlings = onSnapshot(
      collection(db, getCollectionPath('bottlingTasks')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BottlingProcess));
        setBottlings(data);
      },
      (err) => console.error("Errore lettura Bottlings:", err)
    );

    const unsubClients = onSnapshot(
      collection(db, getCollectionPath('clients')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client));
        setClients(data);
      },
      (err) => console.error("Errore lettura Clients:", err)
    );

    const unsubOrders = onSnapshot(
      collection(db, getCollectionPath('orders')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(data);
      },
      (err) => console.error("Errore lettura Orders:", err)
    );

    const unsubTodos = onSnapshot(
      collection(db, getCollectionPath('todos')), 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TodoTask));
        setTodos(data);
      },
      (err) => console.error("Errore lettura Todos:", err)
    );

    return () => {
      unsubTanks();
      unsubInventory();
      unsubBottlings();
      unsubClients();
      unsubOrders();
      unsubTodos();
    };
  }, [user]);

  // Popolamento iniziale se il DB è vuoto
  const initializeDefaultData = async () => {
    if (!user || user.uid === 'local-demo-user') return;
    try {
      const tankSnap = await getDocs(collection(db, getCollectionPath('tanks')));
      if (tankSnap.empty) {
        const initialTanks: Omit<Tank, 'id'>[] = [
          { name: 'Vasca Acciaio A101', capacity: 5000, currentLiters: 3400, wineType: 'Aglianico del Taburno DOCG', ph: 3.55, so2: 35, alcohol: 13.5 },
          { name: 'Vasca Cemento C204', capacity: 8000, currentLiters: 5200, wineType: 'Falanghina del Sannio DOC', ph: 3.25, so2: 42, alcohol: 12.5 },
          { name: 'Tino Legno T1', capacity: 2500, currentLiters: 1500, wineType: 'Aglianico Riserva', ph: 3.48, so2: 28, alcohol: 14.2 },
          { name: 'Vasca Acciaio B05', capacity: 3000, currentLiters: 0, wineType: 'Nessuno (Vuoto)' }
        ];
        for (const tank of initialTanks) {
          await addDoc(collection(db, getCollectionPath('tanks')), tank);
        }
      }

      const invSnap = await getDocs(collection(db, getCollectionPath('inventory')));
      if (invSnap.empty) {
        const initialInventory: Omit<InventoryItem, 'id'>[] = [
          { name: 'Bottiglie Vetro Bordolese 75cl', category: 'MATERIALE_SECCO', quantity: 12000, unit: 'pz' },
          { name: 'Tappi in Sughero Naturale', category: 'MATERIALE_SECCO', quantity: 8000, unit: 'pz' },
          { name: 'Capsule termoretraibili Nere', category: 'MATERIALE_SECCO', quantity: 9500, unit: 'pz' },
          { name: 'Etichette Vigne di Malies Aglianico', category: 'MATERIALE_SECCO', quantity: 4500, unit: 'pz' },
          { name: 'Etichette Vigne di Malies Falanghina', category: 'MATERIALE_SECCO', quantity: 3000, unit: 'pz' },
          { name: 'Fascette di Stato DOCG', category: 'MATERIALE_SECCO', quantity: 2500, unit: 'pz' },
          { name: 'Massa Aglianico 2024 - Vetro Nudo', category: 'VETRO_NUDO', quantity: 1500, unit: 'bottiglie' },
          { name: 'Massa Falanghina 2025 - Vetro Nudo', category: 'VETRO_NUDO', quantity: 2400, unit: 'bottiglie' },
          { name: 'Aglianico del Taburno DOCG 2024 - Finito', category: 'PRODOTTO_FINITO', quantity: 450, unit: 'bottiglie' },
          { name: 'Falanghina del Sannio DOC 2025 - Finito', category: 'PRODOTTO_FINITO', quantity: 800, unit: 'bottiglie' }
        ];
        for (const item of initialInventory) {
          await addDoc(collection(db, getCollectionPath('inventory')), item);
        }
      }

      const clientSnap = await getDocs(collection(db, getCollectionPath('clients')));
      if (clientSnap.empty) {
        const initialClients: Omit<Client, 'id'>[] = [
          { name: 'Enoteca Antichi Sapori', email: 'info@antichisapori.it', phone: '0824 555123', city: 'Benevento' },
          { name: 'Ristorante Il Grappolo d\'Oro', email: 'prenotazioni@grappolodoro.com', phone: '02 4433221', city: 'Milano' },
          { name: 'Distribuzione Campania Vini', email: 'commerciale@campaniavini.it', phone: '081 776655', city: 'Napoli' }
        ];
        for (const c of initialClients) {
          await addDoc(collection(db, getCollectionPath('clients')), c);
        }
      }

      const todoSnap = await getDocs(collection(db, getCollectionPath('todos')));
      if (todoSnap.empty) {
        const initialTodos: Omit<TodoTask, 'id'>[] = [
          { title: 'Verificare pulizia ed igienizzazione della tubazione di imbottigliamento', status: 'DA_FARE' },
          { title: 'Inviare campione Aglianico Riserva per analisi esterne pre-imbottigliamento', status: 'DA_FARE' },
          { title: 'Contattare enoteca Antichi Sapori per accordo spedizione', status: 'COMPLETATO' }
        ];
        for (const t of initialTodos) {
          await addDoc(collection(db, getCollectionPath('todos')), t);
        }
      }
    } catch (err) {
      console.error("Errore durante la creazione dei dati dimostrativi:", err);
    }
  };

  // ==========================================
  // 4. FUNZIONI OPERATIVE & TRANSAZIONI DB
  // ==========================================

  const handleCreateTank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTank.name || newTank.capacity <= 0) return;
    try {
      await addDoc(collection(db, getCollectionPath('tanks')), {
        ...newTank,
        currentLiters: Number(newTank.currentLiters)
      });
      setIsAddingTank(false);
      setNewTank({ name: '', capacity: 2000, currentLiters: 1000, wineType: '' });
      showToast("Nuovo serbatoio registrato con successo!");
    } catch (err) {
      console.error(err);
      showToast("Errore durante la creazione del serbatoio.", "error");
    }
  };

  const handleSaveAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAnalysisTank) return;
    try {
      const tankRef = doc(db, getCollectionPath('tanks'), activeAnalysisTank.id);
      await updateDoc(tankRef, {
        ph: analysisData.ph ? Number(analysisData.ph) : null,
        so2: analysisData.so2 ? Number(analysisData.so2) : null,
        alcohol: analysisData.alcohol ? Number(analysisData.alcohol) : null
      });
      setActiveAnalysisTank(null);
      setAnalysisData({ ph: '', so2: '', alcohol: '' });
      showToast("Analisi chimica aggiornata correttamente.");
    } catch (err) {
      console.error(err);
      showToast("Impossibile salvare i parametri chimici.", "error");
    }
  };

  const handleStartBottling = async () => {
    if (!activeBottlingTank || bottlingLiters <= 0 || bottlingLiters > activeBottlingTank.currentLiters) {
      showToast("La quantità di litri indicata non è valida o supera il volume attuale.", "error");
      return;
    }

    const estimatedBottles = Math.floor(bottlingLiters / 0.75);

    try {
      const bottlingRef = await addDoc(collection(db, getCollectionPath('bottlingTasks')), {
        tankId: activeBottlingTank.id,
        tankName: activeBottlingTank.name,
        wineType: activeBottlingTank.wineType,
        litersUsed: bottlingLiters,
        estimatedBottles: estimatedBottles,
        status: 'IN_CORSO',
        dateStarted: new Date().toLocaleDateString('it-IT')
      });

      const tankRef = doc(db, getCollectionPath('tanks'), activeBottlingTank.id);
      await updateDoc(tankRef, {
        currentLiters: activeBottlingTank.currentLiters - bottlingLiters
      });

      await addDoc(collection(db, getCollectionPath('todos')), {
        title: `Completare imbottigliamento lotto da ${activeBottlingTank.name} (${activeBottlingTank.wineType})`,
        status: 'IN_CORSO',
        relatedEntityId: bottlingRef.id,
        relatedEntityType: 'IMBOTTIGLIAMENTO',
        relatedEntityName: `${activeBottlingTank.name} - ${activeBottlingTank.wineType}`,
        dueDate: new Date().toLocaleDateString('it-IT')
      });

      setActiveBottlingTank(null);
      setBottlingLiters(0);
      showToast(`Lavorazione avviata. Stimate ${estimatedBottles} bottiglie!`);
    } catch (err) {
      console.error(err);
      showToast("Errore durante l'avvio del processo di imbottigliamento.", "error");
    }
  };

  const handleCompleteBottling = async () => {
    if (!activeCompleteBottling || actualBottlesCount <= 0) return;

    try {
      const bottlingRef = doc(db, getCollectionPath('bottlingTasks'), activeCompleteBottling.id);
      await updateDoc(bottlingRef, {
        actualBottles: actualBottlesCount,
        status: 'COMPLETATO',
        dateCompleted: new Date().toLocaleDateString('it-IT')
      });

      const invSnap = await getDocs(collection(db, getCollectionPath('inventory')));
      
      for (const itemDoc of invSnap.docs) {
        const item = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;
        let updateQty = null;

        if (item.name.toLowerCase().includes('bottiglie vetro') || item.name.toLowerCase().includes('bordolese')) {
          updateQty = Math.max(0, item.quantity - actualBottlesCount);
        } else if (item.name.toLowerCase().includes('tappo') || item.name.toLowerCase().includes('tappi')) {
          updateQty = Math.max(0, item.quantity - actualBottlesCount);
        }

        if (updateQty !== null) {
          await updateDoc(doc(db, getCollectionPath('inventory'), item.id), { quantity: updateQty });
        }
      }

      const targetName = `${activeCompleteBottling.wineType} - Vetro Nudo`;
      const existingNudo = inventory.find(i => i.name === targetName && i.category === 'VETRO_NUDO');

      if (existingNudo) {
        await updateDoc(doc(db, getCollectionPath('inventory'), existingNudo.id), {
          quantity: existingNudo.quantity + actualBottlesCount
        });
      } else {
        await addDoc(collection(db, getCollectionPath('inventory')), {
          name: targetName,
          category: 'VETRO_NUDO',
          quantity: actualBottlesCount,
          unit: 'bottiglie'
        });
      }

      const associatedTodo = todos.find(t => t.relatedEntityId === activeCompleteBottling.id);
      if (associatedTodo) {
        await updateDoc(doc(db, getCollectionPath('todos'), associatedTodo.id), {
          status: 'COMPLETATO'
        });
      }

      setActiveCompleteBottling(null);
      setActualBottlesCount(0);
      showToast("Lotto registrato nel magazzino Vetro Nudo e consumabili scaricati.");
    } catch (err) {
      console.error(err);
      showToast("Errore durante il salvataggio dei dati reali.", "error");
    }
  };

  const handleLabelingProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labelingSource || labelingQty <= 0) return;

    const sourceItem = inventory.find(i => i.id === labelingSource);
    if (!sourceItem || sourceItem.quantity < labelingQty) {
      showToast("La quantità selezionata supera la disponibilità del magazzino Vetro Nudo.", "error");
      return;
    }

    try {
      await updateDoc(doc(db, getCollectionPath('inventory'), sourceItem.id), {
        quantity: sourceItem.quantity - labelingQty
      });

      const isDocg = sourceItem.name.toLowerCase().includes('docg');
      const invSnap = await getDocs(collection(db, getCollectionPath('inventory')));

      for (const itemDoc of invSnap.docs) {
        const item = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;
        let updateQty = null;

        if (item.name.toLowerCase().includes('capsule')) {
          updateQty = Math.max(0, item.quantity - labelingQty);
        } else if (item.name.toLowerCase().includes('etichette')) {
          const isAglianico = sourceItem.name.toLowerCase().includes('aglianico');
          const isFalanghina = sourceItem.name.toLowerCase().includes('falanghina');
          if (isAglianico && item.name.toLowerCase().includes('aglianico')) {
            updateQty = Math.max(0, item.quantity - (labelingQty * 2));
          } else if (isFalanghina && item.name.toLowerCase().includes('falanghina')) {
            updateQty = Math.max(0, item.quantity - (labelingQty * 2));
          }
        } else if (isDocg && item.name.toLowerCase().includes('fascette')) {
          updateQty = Math.max(0, item.quantity - labelingQty);
        }

        if (updateQty !== null) {
          await updateDoc(doc(db, getCollectionPath('inventory'), item.id), { quantity: updateQty });
        }
      }

      const targetFinishedName = sourceItem.name.replace('Vetro Nudo', 'Finito');
      const existingFinished = inventory.find(i => i.name === targetFinishedName && i.category === 'PRODOTTO_FINITO');

      if (existingFinished) {
        await updateDoc(doc(db, getCollectionPath('inventory'), existingFinished.id), {
          quantity: existingFinished.quantity + labelingQty
        });
      } else {
        await addDoc(collection(db, getCollectionPath('inventory')), {
          name: targetFinishedName,
          category: 'PRODOTTO_FINITO',
          quantity: labelingQty,
          unit: 'bottiglie'
        });
      }

      await addDoc(collection(db, getCollectionPath('labelings')), {
        bottlesSourceId: sourceItem.id,
        bottlesSourceName: sourceItem.name,
        quantity: labelingQty,
        recipeName: labelingRecipe,
        date: new Date().toLocaleDateString('it-IT')
      });

      setIsLabelingModalOpen(false);
      setLabelingSource('');
      setLabelingQty(0);
      showToast("Confezionamento completato! Prodotto Finito caricato.");
    } catch (err) {
      console.error(err);
      showToast("Errore durante il processo di etichettatura.", "error");
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.name) return;
    try {
      await addDoc(collection(db, getCollectionPath('clients')), newClient);
      setIsAddingClient(false);
      setNewClient({ name: '', email: '', phone: '', city: '' });
      showToast("Nuovo cliente registrato in anagrafica.");
    } catch (err) {
      console.error(err);
      showToast("Errore durante la registrazione del cliente.", "error");
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.clientId || !newOrder.productId || newOrder.quantity <= 0) return;

    const selectedProduct = inventory.find(i => i.id === newOrder.productId);
    const selectedClient = clients.find(c => c.id === newOrder.clientId);

    if (!selectedProduct || selectedProduct.quantity < newOrder.quantity) {
      showToast("Quantità insufficiente in magazzino per procedere con l'ordine.", "error");
      return;
    }

    try {
      await updateDoc(doc(db, getCollectionPath('inventory'), selectedProduct.id), {
        quantity: selectedProduct.quantity - newOrder.quantity
      });

      await addDoc(collection(db, getCollectionPath('orders')), {
        clientId: selectedClient?.id,
        clientName: selectedClient?.name,
        productName: selectedProduct.name,
        quantity: newOrder.quantity,
        date: new Date().toLocaleDateString('it-IT'),
        status: 'EVASO'
      });

      setIsAddingOrder(false);
      setNewOrder({ clientId: '', productId: '', quantity: 1 });
      showToast("Ordine evaso con successo! Scarico magazzino completato.");
    } catch (err) {
      console.error(err);
      showToast("Errore durante la registrazione dell'ordine.", "error");
    }
  };

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.title) return;

    let relatedName = "";
    if (newTodo.relatedEntityId) {
      if (newTodo.relatedEntityType === 'IMBOTTIGLIAMENTO') {
        const process = bottlings.find(b => b.id === newTodo.relatedEntityId);
        relatedName = process ? `${process.tankName} - ${process.wineType}` : "Lotto Imbottigliamento";
      } else if (newTodo.relatedEntityType === 'ORDINE') {
        const order = orders.find(o => o.id === newTodo.relatedEntityId);
        relatedName = order ? `Ordine per ${order.clientName}` : "Ordine Cliente";
      }
    }

    try {
      await addDoc(collection(db, getCollectionPath('todos')), {
        title: newTodo.title,
        status: 'DA_FARE',
        dueDate: newTodo.dueDate || null,
        relatedEntityId: newTodo.relatedEntityId || null,
        relatedEntityType: newTodo.relatedEntityType || null,
        relatedEntityName: relatedName || null
      });
      setIsAddingTodo(false);
      setNewTodo({ title: '', dueDate: '', relatedEntityId: '', relatedEntityType: '' as any });
      showToast("Promemoria aggiunto alla bacheca.");
    } catch (err) {
      console.error(err);
      showToast("Errore nell'inserimento del promemoria.", "error");
    }
  };

  const toggleTodoStatus = async (task: TodoTask) => {
    const nextStatusMap: Record<'DA_FARE' | 'IN_CORSO' | 'COMPLETATO', 'DA_FARE' | 'IN_CORSO' | 'COMPLETATO'> = {
      'DA_FARE': 'IN_CORSO',
      'IN_CORSO': 'COMPLETATO',
      'COMPLETATO': 'DA_FARE'
    };
    try {
      await updateDoc(doc(db, getCollectionPath('todos'), task.id), {
        status: nextStatusMap[task.status]
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    try {
      await deleteDoc(doc(db, getCollectionPath('todos'), id));
      showToast("Task rimosso definitivamente.");
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity < 0) return;
    try {
      await addDoc(collection(db, getCollectionPath('inventory')), {
        ...newItem,
        quantity: Number(newItem.quantity)
      });
      setIsAddingItem(false);
      setNewItem({ name: '', category: 'MATERIALE_SECCO', quantity: 0, unit: 'pz' });
      showToast("Articolo aggiunto al magazzino generale.");
    } catch (err) {
      console.error(err);
      showToast("Errore durante l'aggiunta dell'articolo.", "error");
    }
  };

  const handleQuickAddStock = async (itemId: string, currentQty: number, amount: number) => {
    try {
      await updateDoc(doc(db, getCollectionPath('inventory'), itemId), {
        quantity: Math.max(0, currentQty + amount)
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F9F9FB] text-[#1E1E24] font-sans overflow-hidden">
      
      {/* ----------------------------------------------------
          SISTEMA NOTIFICHE TOAST PERSONALIZZATO (Responsive)
         ---------------------------------------------------- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-3rem)] md:w-full">
        {toasts.map(t => (
          <div 
            key={t.id} 
            className={`p-4 rounded-xl shadow-xl border flex items-center justify-between transition-all duration-300 ${
              t.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-900' 
                : t.type === 'info' 
                  ? 'bg-blue-50 border-blue-200 text-blue-900' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}
          >
            <span className="text-xs font-bold">{t.message}</span>
            <button 
              onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}
              className="text-gray-400 hover:text-gray-600 transition ml-3 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* ----------------------------------------------------
          BARRA DI NAVIGAZIONE CONTESTUALE (SIDEBAR)
          Viene mostrata solo se ci troviamo all'interno di un'area
         ---------------------------------------------------- */}
      {activeArea !== 'HUB' && (
        <>
          {/* Header Mobile per aree di lavoro */}
          <div className="md:hidden bg-white border-b border-[#EBEBEF] px-4 py-3 flex items-center justify-between z-40 shrink-0">
            <button 
              onClick={() => setActiveArea('HUB')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-950"
            >
              <ChevronLeft className="w-4 h-4" /> Home
            </button>
            <h1 className="font-extrabold text-sm text-red-950 uppercase tracking-wider">
              {activeArea}
            </h1>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg border border-[#EBEBEF] text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar Area - Desktop e Mobile overlay */}
          <aside className={`
            fixed md:relative top-0 bottom-0 left-0 w-80 bg-white border-r border-[#EBEBEF] flex flex-col justify-between shrink-0 z-50 transition-transform duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div>
              {/* Header Sidebar con bottone per ritornare alla Dashboard Hub */}
              <div className="p-5 border-b border-[#F4F4F6] space-y-4">
                <button 
                  onClick={() => {
                    setActiveArea('HUB');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-950/5 hover:bg-red-950/10 text-red-950 rounded-xl text-xs font-bold transition border border-red-950/10"
                >
                  <Home className="w-4 h-4" /> Torna alla Dashboard
                </button>

                <div className="flex items-center gap-2 pt-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    Area attiva: <span className="text-gray-700">{activeArea}</span>
                  </p>
                </div>
              </div>

              {/* NAVIGAZIONE SPECIFICA PER OGNI SINGOLA AREA */}
              <nav className="p-4 space-y-1.5">
                {/* 1. Sottomenù Cantina */}
                {activeArea === 'CANTINA' && (
                  <>
                    <button 
                      onClick={() => { setCantinaSubView('SERBATOI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        cantinaSubView === 'SERBATOI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Wine className="w-4 h-4" /> Mappa Serbatoi
                    </button>
                    <button 
                      onClick={() => { setCantinaSubView('ANALISI_STORICO'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        cantinaSubView === 'ANALISI_STORICO' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Activity className="w-4 h-4" /> Registro Analisi & Laboratorio
                    </button>
                  </>
                )}

                {/* 2. Sottomenù Magazzino */}
                {activeArea === 'MAGAZZINO' && (
                  <>
                    <button 
                      onClick={() => { setMagazzinoSubView('INVENTARIO'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        magazzinoSubView === 'INVENTARIO' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Package className="w-4 h-4" /> Inventario Materiali
                    </button>
                    <button 
                      onClick={() => { setMagazzinoSubView('PROCESSI_ATTIVI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        magazzinoSubView === 'PROCESSI_ATTIVI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Activity className="w-4 h-4" /> Lotti in Imbottigliamento
                    </button>
                  </>
                )}

                {/* 3. Sottomenù Vendite */}
                {activeArea === 'VENDITE' && (
                  <>
                    <button 
                      onClick={() => { setVenditeSubView('CLIENTI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        venditeSubView === 'CLIENTI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Users className="w-4 h-4" /> Anagrafica Clienti
                    </button>
                    <button 
                      onClick={() => { setVenditeSubView('ORDINI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        venditeSubView === 'ORDINI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <FileText className="w-4 h-4" /> Ordini ed Evasioni
                    </button>
                  </>
                )}

                {/* 4. Sottomenù Todo */}
                {activeArea === 'TODO' && (
                  <>
                    <button 
                      onClick={() => { setTodoSubView('ATTIVI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        todoSubView === 'ATTIVI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <ListTodo className="w-4 h-4" /> Promemoria Attivi
                    </button>
                    <button 
                      onClick={() => { setTodoSubView('COMPLETATI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${
                        todoSubView === 'COMPLETATI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'
                      }`}
                    >
                      <Check className="w-4 h-4" /> Storico Completati
                    </button>
                  </>
                )}
              </nav>
            </div>

            {/* Chiudi drawer su mobile */}
            {isMobileMenuOpen && (
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="md:hidden m-4 p-3 bg-red-950 text-white rounded-lg font-bold text-center text-xs"
              >
                Chiudi Menù
              </button>
            )}

            {/* Footer Sidebar */}
            <div className="p-4 border-t border-[#F4F4F6] bg-[#FAFAFC]">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <div className="text-xs">
                  <p className="font-bold text-gray-800">Sincronizzazione Attiva</p>
                  <p className="text-gray-500 text-[9px] truncate">AppId: {appId}</p>
                </div>
              </div>
            </div>
          </aside>
          
          {/* Sfondo oscurato mobile per quando la sidebar è aperta */}
          {isMobileMenuOpen && (
            <div 
              onClick={() => setIsMobileMenuOpen(false)} 
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
            />
          )}
        </>
      )}

      {/* ----------------------------------------------------
          CONTENITORE CONTENUTI PRINCIPALE
         ---------------------------------------------------- */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-red-950 animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-500">Inizializzazione database Vigne di Malies...</p>
          </div>
        ) : (
          <>
            {/* ====================================================
                VIEW 0: DASHBOARD PORTALE (HUB DI BENVENUTO)
               ==================================================== */}
            {activeArea === 'HUB' && (
              <div className="max-w-6xl mx-auto space-y-10 py-6 animate-fadeIn">
                {/* Header Portale */}
                <div className="text-center md:text-left border-b border-[#EBEBEF] pb-6 space-y-2">
                  <div className="inline-flex items-center gap-3 bg-red-950/5 text-red-950 px-4 py-1.5 rounded-full border border-red-950/10">
                    <Wine className="w-4 h-4" />
                    <span className="text-xs font-black tracking-widest uppercase">Gestionale Aziendale</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-black text-red-950">Vigne di Malies</h2>
                  <p className="text-sm text-gray-500 max-w-xl">Benvenuto nel portale gestionale. Seleziona un'area di lavoro per accedere alle funzioni e ai dati dedicati.</p>
                </div>

                {/* Griglia Grandi Pulsanti Aree */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  
                  {/* Card Area 1: Campagna (Disabilitata per ora) */}
                  <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-emerald-300 transition-all shadow-sm opacity-80 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl border-l border-b border-emerald-200">
                      Prossimamente
                    </div>
                    <div>
                      <div className="w-14 h-14 bg-emerald-50 text-emerald-800 rounded-xl flex items-center justify-center mb-6 border border-emerald-100">
                        <Leaf className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-xl text-gray-900">Area Campagna</h3>
                      <p className="text-xs text-gray-400 mt-2">Quaderno di campagna, rilievi meteo e agronomia di precisione.</p>
                    </div>
                    <div className="pt-8">
                      <button disabled className="w-full py-3 bg-gray-50 text-gray-400 text-xs font-bold rounded-xl cursor-not-allowed">
                        Area in Sviluppo
                      </button>
                    </div>
                  </div>

                  {/* Card Area 2: Cantina */}
                  <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-red-950/20 hover:shadow-md transition-all shadow-sm group">
                    <div>
                      <div className="w-14 h-14 bg-red-50 text-red-900 rounded-xl flex items-center justify-center mb-6 border border-red-100">
                        <Wine className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-xl text-red-950">Area Cantina</h3>
                      <p className="text-xs text-gray-500 mt-2">Mappatura dei vasi vinari, parametri chimici di laboratorio e travaso delle masse.</p>
                    </div>
                    <div className="pt-8">
                      <button 
                        onClick={() => { setActiveArea('CANTINA'); setCantinaSubView('SERBATOI'); }}
                        className="w-full py-3 bg-red-950 hover:bg-red-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Entra in Cantina
                      </button>
                    </div>
                  </div>

                  {/* Card Area 3: Magazzino */}
                  <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-amber-950/20 hover:shadow-md transition-all shadow-sm group">
                    <div>
                      <div className="w-14 h-14 bg-amber-50 text-amber-800 rounded-xl flex items-center justify-center mb-6 border border-amber-100">
                        <Package className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-xl text-amber-950">Area Magazzino</h3>
                      <p className="text-xs text-gray-500 mt-2">Inventario dei materiali secchi, lotti in vetro nudo e imbottigliamento.</p>
                    </div>
                    <div className="pt-8">
                      <button 
                        onClick={() => { setActiveArea('MAGAZZINO'); setMagazzinoSubView('INVENTARIO'); }}
                        className="w-full py-3 bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Entra nel Magazzino
                      </button>
                    </div>
                  </div>

                  {/* Card Area 4: Vendite */}
                  <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-blue-950/20 hover:shadow-md transition-all shadow-sm group">
                    <div>
                      <div className="w-14 h-14 bg-blue-50 text-blue-800 rounded-xl flex items-center justify-center mb-6 border border-blue-100">
                        <ShoppingCart className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-xl text-blue-950">Area Vendite</h3>
                      <p className="text-xs text-gray-500 mt-2">Registro clienti, ordini pronti alla spedizione e storico vendite geografico.</p>
                    </div>
                    <div className="pt-8">
                      <button 
                        onClick={() => { setActiveArea('VENDITE'); setVenditeSubView('CLIENTI'); }}
                        className="w-full py-3 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Entra in Vendite
                      </button>
                    </div>
                  </div>

                  {/* Card Area 5: Cose da Fare */}
                  <div className="bg-white rounded-2xl border border-[#EBEBEF] p-6 flex flex-col justify-between hover:border-purple-950/20 hover:shadow-md transition-all shadow-sm group">
                    <div>
                      <div className="w-14 h-14 bg-purple-50 text-purple-800 rounded-xl flex items-center justify-center mb-6 border border-purple-100">
                        <ListTodo className="w-8 h-8" />
                      </div>
                      <h3 className="font-extrabold text-xl text-purple-950">Area Cose da fare</h3>
                      <p className="text-xs text-gray-500 mt-2">Task manager per creare promemoria interni agganciati a lotti di produzione o ordini.</p>
                    </div>
                    <div className="pt-8">
                      <button 
                        onClick={() => { setActiveArea('TODO'); setTodoSubView('ATTIVI'); }}
                        className="w-full py-3 bg-purple-950 hover:bg-purple-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
                      >
                        Apri Promemoria ({todos.filter(t => t.status !== 'COMPLETATO').length})
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* ====================================================
                VIEW 1: AREA CANTINA (Mappa Serbatoi & Analisi)
               ==================================================== */}
            {activeArea === 'CANTINA' && (
              <div className="space-y-8 animate-fadeIn">
                
                {cantinaSubView === 'SERBATOI' && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Cantina e Vasi Vinari</h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Gestione dei serbatoi, volumi attuali e imbottigliamento lotti.</p>
                      </div>
                      <button 
                        onClick={() => setIsAddingTank(true)} 
                        className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Aggiungi Serbatoio
                      </button>
                    </div>

                    {/* Mappa Serbatoi */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {tanks.map(tank => {
                        const fillPercentage = Math.round((tank.currentLiters / tank.capacity) * 100);
                        return (
                          <div key={tank.id} className="bg-white rounded-xl border border-[#EBEBEF] shadow-sm hover:shadow-md transition flex flex-col justify-between overflow-hidden">
                            <div className="p-5 space-y-4">
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <h3 className="font-extrabold text-base text-gray-900">{tank.name}</h3>
                                  <p className="text-[11px] font-semibold text-gray-400 uppercase mt-0.5">Capacità: {tank.capacity} L</p>
                                </div>
                                <span className={`text-[10px] md:text-[11px] font-extrabold px-2 py-1 rounded-full ${
                                  tank.currentLiters > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {tank.wineType || 'Vuoto'}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex justify-between text-xs font-bold text-gray-600">
                                  <span>Riempimento: {tank.currentLiters} L</span>
                                  <span>{fillPercentage}%</span>
                                </div>
                                <div className="w-full bg-[#F4F4F6] rounded-full h-3.5 overflow-hidden border border-gray-100 p-0.5">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      tank.wineType.toLowerCase().includes('falanghina') 
                                        ? 'bg-gradient-to-r from-amber-300 to-yellow-400' 
                                        : tank.wineType.toLowerCase().includes('aglianico') 
                                          ? 'bg-gradient-to-r from-red-800 to-rose-950' 
                                          : 'bg-blue-500'
                                    }`} 
                                    style={{ width: `${Math.min(100, fillPercentage)}%` }}
                                  ></div>
                                </div>
                              </div>

                              <div className="bg-[#FAF9F6] p-2.5 rounded-lg border border-dashed border-[#E5E2D9] grid grid-cols-3 gap-1.5 text-center text-xs">
                                <div>
                                  <p className="text-gray-400 font-medium text-[10px]">pH</p>
                                  <p className="font-extrabold text-gray-800">{tank.ph !== undefined ? tank.ph : '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 font-medium text-[10px]">SO₂ Libera</p>
                                  <p className="font-extrabold text-gray-800 text-[11px]">{tank.so2 !== undefined ? `${tank.so2} mg/L` : '-'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-400 font-medium text-[10px]">Grado</p>
                                  <p className="font-extrabold text-gray-800">{tank.alcohol !== undefined ? `${tank.alcohol}%` : '-'}</p>
                                </div>
                              </div>
                            </div>

                            <div className="p-3 bg-[#FAFAFC] border-t border-[#F4F4F6] flex gap-2">
                              <button 
                                onClick={() => {
                                  setActiveAnalysisTank(tank);
                                  setAnalysisData({
                                    ph: tank.ph ? String(tank.ph) : '',
                                    so2: tank.so2 ? String(tank.so2) : '',
                                    alcohol: tank.alcohol ? String(tank.alcohol) : ''
                                  });
                                }} 
                                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs py-2 rounded-lg border border-gray-200 shadow-sm transition"
                              >
                                Analisi
                              </button>
                              <button 
                                disabled={tank.currentLiters === 0}
                                onClick={() => {
                                  setActiveBottlingTank(tank);
                                  setBottlingLiters(tank.currentLiters);
                                }}
                                className={`flex-1 font-bold text-xs py-2 rounded-lg transition shadow-sm ${
                                  tank.currentLiters > 0 
                                    ? 'bg-red-950 text-white hover:bg-red-900' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                }`}
                              >
                                Imbottiglia
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Registro storico laboratorio */}
                {cantinaSubView === 'ANALISI_STORICO' && (
                  <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
                    <h3 className="font-extrabold text-lg text-red-950">Analisi Chimiche di Laboratorio</h3>
                    <p className="text-xs text-gray-500">Riepilogo delle ultime misurazioni memorizzate per ciascun vaso vinario.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px]">
                            <th className="py-3 px-4">Serbatoio</th>
                            <th className="py-3 px-4">Vino contenuto</th>
                            <th className="py-3 px-4 text-center">pH</th>
                            <th className="py-3 px-4 text-center">SO₂ Libera (mg/l)</th>
                            <th className="py-3 px-4 text-center">Alcol % Vol</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tanks.map(t => (
                            <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="py-3 px-4 font-bold">{t.name}</td>
                              <td className="py-3 px-4 font-extrabold text-gray-700">{t.wineType}</td>
                              <td className="py-3 px-4 text-center font-bold text-gray-900">{t.ph || '-'}</td>
                              <td className="py-3 px-4 text-center font-bold text-gray-900">{t.so2 || '-'}</td>
                              <td className="py-3 px-4 text-center font-bold text-gray-900">{t.alcohol ? `${t.alcohol}%` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL CREAZIONE SERBATOIO */}
                {isAddingTank && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-red-950">Aggiungi Serbatoio</h3>
                        <button onClick={() => setIsAddingTank(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleCreateTank} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Vasca/Serbatoio</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Es. Vasca Acciaio A102" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                            value={newTank.name}
                            onChange={(e) => setNewTank({...newTank, name: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Capacità Totale (Litri)</label>
                            <input 
                              type="number" 
                              required
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                              value={newTank.capacity}
                              onChange={(e) => setNewTank({...newTank, capacity: Number(e.target.value)})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Litri Iniziali</label>
                            <input 
                              type="number" 
                              required
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                              value={newTank.currentLiters}
                              onChange={(e) => setNewTank({...newTank, currentLiters: Number(e.target.value)})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Varietà/Tipologia Vino</label>
                          <input 
                            type="text" 
                            placeholder="Es. Aglianico del Taburno, Falanghina, ecc." 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                            value={newTank.wineType}
                            onChange={(e) => setNewTank({...newTank, wineType: e.target.value})}
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddingTank(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL ANALISI CHIMICA */}
                {activeAnalysisTank && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-red-950">Laboratorio Interno</h3>
                          <p className="text-xs text-gray-400 mt-0.5">{activeAnalysisTank.name}</p>
                        </div>
                        <button onClick={() => setActiveAnalysisTank(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleSaveAnalysis} className="space-y-4">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">pH</label>
                            <input 
                              type="number" 
                              step="0.01"
                              placeholder="Es. 3.45"
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                              value={analysisData.ph}
                              onChange={(e) => setAnalysisData({...analysisData, ph: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SO₂ Libera</label>
                            <input 
                              type="number" 
                              placeholder="Es. 35"
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                              value={analysisData.so2}
                              onChange={(e) => setAnalysisData({...analysisData, so2: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Grado %</label>
                            <input 
                              type="number" 
                              step="0.1"
                              placeholder="Es. 13.5"
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none"
                              value={analysisData.alcohol}
                              onChange={(e) => setAnalysisData({...analysisData, alcohol: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setActiveAnalysisTank(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Chiudi</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL IMBOTTIGLIAMENTO (AVVIO PROCESSO) */}
                {activeBottlingTank && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6 text-sm">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-red-950">Nuovo Lotto Vetro Nudo</h3>
                          <p className="text-xs text-amber-800 font-bold mt-0.5">Origine: {activeBottlingTank.name}</p>
                        </div>
                        <button onClick={() => setActiveBottlingTank(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Litri di vino da imbottigliare</label>
                          <input 
                            type="number" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
                            max={activeBottlingTank.currentLiters}
                            value={bottlingLiters}
                            onChange={(e) => setBottlingLiters(Number(e.target.value))}
                          />
                        </div>

                        <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 flex items-center justify-between">
                          <div>
                            <p className="text-xs text-red-950 font-bold">Stima Bottiglie in Uscita</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Basato su bottiglie da 0.75L</p>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-red-950">
                              {Math.floor(bottlingLiters / 0.75)}
                            </span>
                            <span className="text-xs text-gray-500 block">bottiglie</span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button onClick={() => setActiveBottlingTank(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button onClick={handleStartBottling} className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Inizia</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====================================================
                VIEW 2: AREA MAGAZZINO (Fase A/B & Ricette)
               ==================================================== */}
            {activeArea === 'MAGAZZINO' && (
              <div className="space-y-8 animate-fadeIn">
                
                {magazzinoSubView === 'INVENTARIO' && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Gestione Magazzino</h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Giacenze materiali secchi, lotti in vetro nudo ed etichettatura in tempo reale.</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => setIsLabelingModalOpen(true)}
                          className="w-full sm:w-auto bg-amber-700 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-amber-800 transition flex items-center justify-center gap-2 shadow-sm animate-pulse"
                        >
                          <Tag className="w-4 h-4" /> Etichetta Vetro Nudo
                        </button>
                        <button 
                          onClick={() => setIsAddingItem(true)} 
                          className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> Aggiungi Articolo
                        </button>
                      </div>
                    </div>

                    {/* Griglia Tre Categorie del Magazzino */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Categoria 1: Materiale Secco */}
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                            <Sliders className="w-4 h-4 text-amber-800" />
                            1. Materiali Secchi
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {inventory.filter(i => i.category === 'MATERIALE_SECCO').map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
                              <div>
                                <p className="font-bold text-gray-800">{item.name}</p>
                                <p className="text-[10px] text-gray-400 font-semibold uppercase mt-0.5">{item.quantity} {item.unit}</p>
                              </div>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleQuickAddStock(item.id, item.quantity, 500)}
                                  className="bg-white border border-gray-200 text-[10px] px-2 py-1 rounded font-bold shadow-sm"
                                >
                                  +500
                                </button>
                                <button 
                                  onClick={() => handleQuickAddStock(item.id, item.quantity, -100)}
                                  className="bg-white border border-gray-200 text-[10px] px-2 py-1 rounded font-bold shadow-sm"
                                >
                                  -100
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Categoria 2: Vetro Nudo */}
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                            <Wine className="w-4 h-4 text-amber-800" />
                            2. Vetro Nudo (Imbottigliato)
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {inventory.filter(i => i.category === 'VETRO_NUDO').map(item => (
                            <div key={item.id} className="bg-amber-50/10 p-3 rounded-lg border border-amber-100 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-extrabold text-amber-950">{item.name}</p>
                                <p className="text-[10px] text-amber-800 font-bold uppercase mt-0.5">{item.quantity} pz</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setLabelingSource(item.id);
                                  setLabelingQty(item.quantity);
                                  setIsLabelingModalOpen(true);
                                }}
                                className="bg-amber-800 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-md"
                              >
                                Confez.
                              </button>
                            </div>
                          ))}
                          {inventory.filter(i => i.category === 'VETRO_NUDO').length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-8">Nessun lotto in vetro nudo.</p>
                          )}
                        </div>
                      </div>

                      {/* Categoria 3: Prodotto Finito */}
                      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h3 className="font-extrabold text-base text-red-950 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-800" />
                            3. Prodotto Finito (Pronto)
                          </h3>
                        </div>
                        <div className="space-y-3">
                          {inventory.filter(i => i.category === 'PRODOTTO_FINITO').map(item => (
                            <div key={item.id} className="bg-emerald-50/10 p-3 rounded-lg border border-emerald-100 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-extrabold text-emerald-950">{item.name}</p>
                                <p className="text-[10px] text-emerald-800 font-bold uppercase mt-0.5">{item.quantity} pz</p>
                              </div>
                              <span className="text-[9px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-extrabold border border-emerald-200 uppercase">Vendibile</span>
                            </div>
                          ))}
                          {inventory.filter(i => i.category === 'PRODOTTO_FINITO').length === 0 && (
                            <p className="text-xs text-gray-400 text-center py-8">Nessun vino confezionato pronto.</p>
                          )}
                        </div>
                      </div>

                    </div>
                  </>
                )}

                {/* Sottoveduta Lotti di imbottigliamento attivi */}
                {magazzinoSubView === 'PROCESSI_ATTIVI' && (
                  <div className="space-y-4 text-sm">
                    <h3 className="font-extrabold text-lg text-red-950">Lotti in Processo di Imbottigliamento</h3>
                    <p className="text-xs text-gray-500">Masse di vino prelevate dalle vasche di cui va confermato il volume reale e i consumabili usati.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {bottlings.map(process => (
                        <div key={process.id} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm">
                          <div>
                            <span className={`inline-block text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                              process.status === 'IN_CORSO' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {process.status}
                            </span>
                            <h4 className="font-extrabold text-base text-gray-900 mt-2">{process.wineType}</h4>
                            <p className="text-xs text-gray-500">Origine: {process.tankName} • {process.litersUsed} Litri</p>
                          </div>
                          {process.status === 'IN_CORSO' && (
                            <button 
                              onClick={() => {
                                setActiveCompleteBottling(process);
                                setActualBottlesCount(process.estimatedBottles);
                              }}
                              className="w-full bg-red-950 text-white font-bold text-xs py-2 rounded-lg"
                            >
                              Completa & Carica Magazzino
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* MODAL CHIUSURA IMBOTTIGLIAMENTO */}
                {activeCompleteBottling && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-red-950">Registra Quantità Effettiva</h3>
                          <p className="text-xs text-gray-400 mt-0.5">La massa vino verrà scalata dalla vasca d'origine</p>
                        </div>
                        <button onClick={() => setActiveCompleteBottling(null)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Bottiglie da 0.75L prodotte</label>
                          <input 
                            type="number" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900 font-bold"
                            value={actualBottlesCount}
                            onChange={(e) => setActualBottlesCount(Number(e.target.value))}
                          />
                        </div>

                        <div className="bg-[#FAF9F6] border border-gray-200 rounded-xl p-4 text-xs space-y-2">
                          <p className="font-extrabold text-gray-800 uppercase tracking-wider">Distinta Base Scaricata</p>
                          <div className="flex justify-between text-gray-600">
                            <span>Vetro Vuoto:</span>
                            <span className="font-bold text-gray-900">-{actualBottlesCount} pz</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Tappi Sughero:</span>
                            <span className="font-bold text-gray-900">-{actualBottlesCount} pz</span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button onClick={() => setActiveCompleteBottling(null)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button onClick={handleCompleteBottling} className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Conferma</button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MODAL ETICHETTATURA */}
                {isLabelingModalOpen && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-extrabold text-red-950">Etichettatura e Confezionamento</h3>
                          <p className="text-xs text-gray-400 mt-0.5">Seleziona la ricetta e trasforma il Vetro Nudo</p>
                        </div>
                        <button onClick={() => setIsLabelingModalOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleLabelingProcess} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Lotto Vetro Nudo</label>
                          <select 
                            required
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                            value={labelingSource}
                            onChange={(e) => {
                              setLabelingSource(e.target.value);
                              const selected = inventory.find(i => i.id === e.target.value);
                              if (selected) setLabelingQty(selected.quantity);
                            }}
                          >
                            <option value="">Seleziona...</option>
                            {inventory.filter(i => i.category === 'VETRO_NUDO').map(item => (
                              <option key={item.id} value={item.id}>{item.name} ({item.quantity} pz)</option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità</label>
                            <input 
                              type="number" 
                              required
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                              value={labelingQty}
                              onChange={(e) => setLabelingQty(Number(e.target.value))}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Linea / Ricetta</label>
                            <select 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                              value={labelingRecipe}
                              onChange={(e) => setLabelingRecipe(e.target.value)}
                            >
                              <option value="Linea Classica Malies">Linea Classica Malies</option>
                              <option value="Linea Riserva Oro">Linea Riserva Oro</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsLabelingModalOpen(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-amber-800 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-amber-950">Procedi</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL AGGIUNTA ARTICOLO MANUALE */}
                {isAddingItem && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-red-950">Nuovo Articolo Magazzino</h3>
                        <button onClick={() => setIsAddingItem(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleCreateInventoryItem} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Articolo</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Es. Capsule Oro lucido" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                            value={newItem.name}
                            onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                            <select 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                              value={newItem.category}
                              onChange={(e) => setNewItem({...newItem, category: e.target.value as any})}
                            >
                              <option value="MATERIALE_SECCO">Materiale Secco</option>
                              <option value="VETRO_NUDO">Vetro Nudo</option>
                              <option value="PRODOTTO_FINITO">Prodotto Finito</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unità</label>
                            <input 
                              type="text" 
                              required
                              placeholder="pz, kg, bottiglie" 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                              value={newItem.unit}
                              onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità Iniziale</label>
                          <input 
                            type="number" 
                            required
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                            value={newItem.quantity}
                            onChange={(e) => setNewItem({...newItem, quantity: Number(e.target.value)})}
                          />
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddingItem(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====================================================
                VIEW 3: AREA VENDITE (Clienti & Ordini)
               ==================================================== */}
            {activeArea === 'VENDITE' && (
              <div className="space-y-8 animate-fadeIn">
                
                {venditeSubView === 'CLIENTI' && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Anagrafica Clienti</h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Elenco dei clienti abilitati, recapiti e storico spedizioni.</p>
                      </div>
                      <button 
                        onClick={() => setIsAddingClient(true)} 
                        className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Users className="w-4 h-4" /> Nuovo Cliente
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {clients.map(client => {
                        const clientOrders = orders.filter(o => o.clientId === client.id);
                        return (
                          <div key={client.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-extrabold text-lg text-gray-900">{client.name}</h4>
                                <span className="text-[10px] bg-red-50 text-red-950 px-2 py-0.5 rounded font-bold border border-red-100">
                                  {clientOrders.length} Spedizioni
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 font-bold uppercase mt-1">Sede: {client.city || 'Non indicata'}</p>
                              <div className="text-xs text-gray-500 mt-3 space-y-1">
                                {client.phone && <p>📞 {client.phone}</p>}
                                {client.email && <p>✉️ {client.email}</p>}
                              </div>
                            </div>
                            {clientOrders.length > 0 && (
                              <div className="text-xs bg-[#FAF9F6] p-3 rounded-xl border border-gray-200/50 space-y-1">
                                <p className="font-extrabold text-gray-400 text-[10px] uppercase">Ultimi Acquisti:</p>
                                {clientOrders.slice(0, 2).map((o, idx) => (
                                  <div key={idx} className="flex justify-between text-gray-600">
                                    <span className="truncate max-w-[150px]">{o.productName.replace(' - Finito', '')}</span>
                                    <span className="font-bold">{o.quantity} pz</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {venditeSubView === 'ORDINI' && (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Ordini ed Evasioni</h2>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">Storico delle bottiglie etichettate spedite dal magazzino.</p>
                      </div>
                      <button 
                        onClick={() => { setIsAddingOrder(true); }}
                        className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Plus className="w-4 h-4" /> Nuovo Ordine Spedito
                      </button>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 overflow-x-auto text-sm">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 font-extrabold uppercase text-[10px]">
                            <th className="py-3 px-4">Data</th>
                            <th className="py-3 px-4">Destinatario</th>
                            <th className="py-3 px-4">Vino</th>
                            <th className="py-3 px-4 text-center">Quantità</th>
                            <th className="py-3 px-4 text-right">Stato</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map(order => (
                            <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="py-3.5 px-4 font-bold">{renderDate(order.date)}</td>
                              <td className="py-3.5 px-4 font-extrabold text-gray-800">{order.clientName}</td>
                              <td className="py-3.5 px-4 font-bold text-gray-700">{order.productName.replace(' - Finito', '')}</td>
                              <td className="py-3.5 px-4 text-center font-extrabold text-gray-900">{order.quantity} btg</td>
                              <td className="py-3.5 px-4 text-right">
                                <span className="inline-block bg-emerald-100 text-emerald-950 border border-emerald-200 font-extrabold px-2.5 py-1 rounded-full text-[9px] uppercase">
                                  Merce Evasa
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* MODAL NUOVO CLIENTE */}
                {isAddingClient && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-red-950">Aggiungi Cliente</h3>
                        <button onClick={() => setIsAddingClient(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleCreateClient} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nominativo / Enoteca / Ristorante</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Es. Ristorante da Mimmo" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                            value={newClient.name}
                            onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Città</label>
                            <input 
                              type="text" 
                              placeholder="Es. Milano" 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                              value={newClient.city}
                              onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefono</label>
                            <input 
                              type="text" 
                              placeholder="Es. 02 5551234" 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                              value={newClient.phone}
                              onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                            />
                          </div>
                        </div>
                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddingClient(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* MODAL NUOVO ORDINE */}
                {isAddingOrder && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-red-950">Evasione Spedizione Ordine</h3>
                        <button onClick={() => setIsAddingOrder(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleCreateOrder} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Cliente</label>
                          <select 
                            required
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                            value={newOrder.clientId}
                            onChange={(e) => setNewOrder({...newOrder, clientId: e.target.value})}
                          >
                            <option value="">Seleziona...</option>
                            {clients.map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Prodotto Finito</label>
                          <select 
                            required
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                            value={newOrder.productId}
                            onChange={(e) => setNewOrder({...newOrder, productId: e.target.value})}
                          >
                            <option value="">Seleziona...</option>
                            {inventory.filter(i => i.category === 'PRODOTTO_FINITO').map(item => (
                              <option key={item.id} value={item.id}>{item.name} ({item.quantity} pz disponibili)</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantità</label>
                          <input 
                            type="number" 
                            required
                            min="1"
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                            value={newOrder.quantity}
                            onChange={(e) => setNewOrder({...newOrder, quantity: Number(e.target.value)})}
                          />
                        </div>

                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddingOrder(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Spedisci</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ====================================================
                VIEW 4: AREA TODO (Task Manager Promemoria)
               ==================================================== */}
            {activeArea === 'TODO' && (
              <div className="space-y-8 animate-fadeIn max-w-4xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-red-950">Area Cose da fare</h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">Gestione dei task interni e note operative della cantina.</p>
                  </div>
                  <button 
                    onClick={() => setIsAddingTodo(true)} 
                    className="w-full sm:w-auto bg-red-950 text-white font-bold text-xs px-4 py-2.5 rounded-lg hover:bg-red-900 transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Nuovo Promemoria
                  </button>
                </div>

                {/* Filtro sub view */}
                <div className="space-y-3 text-sm">
                  {todos
                    .filter(t => (todoSubView === 'ATTIVI' ? t.status !== 'COMPLETATO' : t.status === 'COMPLETATO'))
                    .map(task => (
                      <div 
                        key={task.id} 
                        className={`p-4 rounded-xl border transition-all flex items-center justify-between ${
                          task.status === 'COMPLETATO' 
                            ? 'bg-[#FAFAFC] border-gray-200 opacity-60' 
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleTodoStatus(task)}
                            className={`w-6 h-6 rounded-full flex items-center justify-center border transition ${
                              task.status === 'COMPLETATO' 
                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                : 'border-gray-300 hover:border-red-950 bg-white'
                            }`}
                          >
                            {task.status === 'COMPLETATO' && <Check className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <p className={`font-extrabold text-sm ${task.status === 'COMPLETATO' ? 'line-through text-gray-400' : 'text-gray-950'}`}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2.5 mt-1.5 text-[10px]">
                              {task.dueDate && <span className="text-gray-400">Scadenza: {renderDate(task.dueDate)}</span>}
                              {task.relatedEntityId && (
                                <span className="text-blue-800 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                  🔗 {task.relatedEntityName || 'Processo Collegato'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteTodo(task.id)}
                          className="text-gray-400 hover:text-red-600 p-1 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                </div>

                {/* MODAL CREAZIONE TODO */}
                {isAddingTodo && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 text-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xl font-extrabold text-red-950">Nuovo Promemoria Aziendale</h3>
                        <button onClick={() => setIsAddingTodo(false)} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
                      </div>
                      <form onSubmit={handleCreateTodo} className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cosa c'è da fare?</label>
                          <input 
                            type="text" 
                            required
                            placeholder="Es. Sostituire filtri a cartuccia" 
                            className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                            value={newTodo.title}
                            onChange={(e) => setNewTodo({...newTodo, title: e.target.value})}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data Scadenza</label>
                            <input 
                              type="date" 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                              value={newTodo.dueDate}
                              onChange={(e) => setNewTodo({...newTodo, dueDate: e.target.value})}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tipo Associazione</label>
                            <select 
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                              value={newTodo.relatedEntityType}
                              onChange={(e) => setNewTodo({...newTodo, relatedEntityType: e.target.value as any})}
                            >
                              <option value="">Nessuna associazione</option>
                              <option value="IMBOTTIGLIAMENTO">Processo Imbottigliamento</option>
                              <option value="ORDINE">Ordine Spedizione</option>
                            </select>
                          </div>
                        </div>

                        {newTodo.relatedEntityType === 'IMBOTTIGLIAMENTO' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Lotto Imbottigliamento</label>
                            <select 
                              required
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                              value={newTodo.relatedEntityId}
                              onChange={(e) => setNewTodo({...newTodo, relatedEntityId: e.target.value})}
                            >
                              <option value="">Seleziona lotto attivo...</option>
                              {bottlings.filter(b => b.status === 'IN_CORSO').map(b => (
                                <option key={b.id} value={b.id}>{b.tankName} - {b.wineType}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {newTodo.relatedEntityType === 'ORDINE' && (
                          <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seleziona Ordine Cliente</label>
                            <select 
                              required
                              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm bg-white"
                              value={newTodo.relatedEntityId}
                              onChange={(e) => setNewTodo({...newTodo, relatedEntityId: e.target.value})}
                            >
                              <option value="">Seleziona ordine...</option>
                              {orders.map(o => (
                                <option key={o.id} value={o.id}>Spedizione a {o.clientName} ({o.quantity} pz)</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex gap-3 pt-4">
                          <button type="button" onClick={() => setIsAddingTodo(false)} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
                          <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">Salva Task</button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
