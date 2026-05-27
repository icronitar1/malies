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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  Wine, Package, ListTodo, ShoppingCart, Leaf, Plus, Check, Trash2,
  Loader2, Users, Tag, Sliders, X, Menu, ChevronLeft, Home, FileText, Activity
} from 'lucide-react';
import {
  Tank, InventoryItem, BottlingProcess, Client, Order, TodoTask,
  ToastMessage, ActiveArea
} from './types';
import ToastContainer from './modules/Toast';
import LoginModal from './modules/Login';
import Dashboard from './modules/Dashboard';
import Cantina from './modules/Cantina';
import Magazzino from './modules/Magazzino';
import Vendite from './modules/Vendite';
import Todo from './modules/Todo';

// ==========================================
// CONFIGURAZIONE FIREBASE & UTILS
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
// COMPONENTE PRINCIPALE (ORCHESTRATORE)
// ==========================================
export default function MainApp() {
  // ======================= STATI =======================
  const [user, setUser] = useState<User | null>(null);
  const [activeArea, setActiveArea] = useState<ActiveArea>('HUB');
  const [cantinaSubView, setCantinaSubView] = useState<'SERBATOI' | 'ANALISI_STORICO'>('SERBATOI');
  const [magazzinoSubView, setMagazzinoSubView] = useState<'INVENTARIO' | 'PROCESSI_ATTIVI'>('INVENTARIO');
  const [venditeSubView, setVenditeSubView] = useState<'CLIENTI' | 'ORDINI'>('CLIENTI');
  const [todoSubView, setTodoSubView] = useState<'ATTIVI' | 'COMPLETATI'>('ATTIVI');
  const [loading, setLoading] = useState<boolean>(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dati
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [bottlings, setBottlings] = useState<BottlingProcess[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [todos, setTodos] = useState<TodoTask[]>([]);

  // Form e modali (stati identici all'originale)
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

  // Autenticazione
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // ======================= EFFETTI INIZIALI =======================
  // Stili animazione
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

  // Toast
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ======================= AUTENTICAZIONE =======================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        setLoading(false);
        initializeDefaultData();
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Accesso effettuato!", "success");
    setIsLoginModalOpen(false);
  };

  const handleRegister = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
    showToast("Registrazione completata!", "success");
    setIsLoginModalOpen(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    showToast("Sei uscito dal sistema", "info");
  };

  // ======================= SINCRONIZZAZIONE FIRESTORE =======================
  useEffect(() => {
    if (!user) return;

    const unsubTanks = onSnapshot(collection(db, getCollectionPath('tanks')), (snapshot) => {
      setTanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tank)));
      setLoading(false);
    });
    const unsubInventory = onSnapshot(collection(db, getCollectionPath('inventory')), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    });
    const unsubBottlings = onSnapshot(collection(db, getCollectionPath('bottlingTasks')), (snapshot) => {
      setBottlings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BottlingProcess)));
    });
    const unsubClients = onSnapshot(collection(db, getCollectionPath('clients')), (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Client)));
    });
    const unsubOrders = onSnapshot(collection(db, getCollectionPath('orders')), (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });
    const unsubTodos = onSnapshot(collection(db, getCollectionPath('todos')), (snapshot) => {
      setTodos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TodoTask)));
    });

    return () => {
      unsubTanks();
      unsubInventory();
      unsubBottlings();
      unsubClients();
      unsubOrders();
      unsubTodos();
    };
  }, [user]);

  // ======================= POPOLAMENTO INIZIALE =======================
  const initializeDefaultData = async () => {
    if (!user) return;
    try {
      const tankSnap = await getDocs(collection(db, getCollectionPath('tanks')));
      if (tankSnap.empty) {
        const initialTanks: Omit<Tank, 'id'>[] = [
          { name: 'Vasca Acciaio A101', capacity: 5000, currentLiters: 3400, wineType: 'Aglianico del Taburno DOCG', ph: 3.55, so2: 35, alcohol: 13.5 },
          { name: 'Vasca Cemento C204', capacity: 8000, currentLiters: 5200, wineType: 'Falanghina del Sannio DOC', ph: 3.25, so2: 42, alcohol: 12.5 },
          { name: 'Tino Legno T1', capacity: 2500, currentLiters: 1500, wineType: 'Aglianico Riserva', ph: 3.48, so2: 28, alcohol: 14.2 },
          { name: 'Vasca Acciaio B05', capacity: 3000, currentLiters: 0, wineType: 'Nessuno (Vuoto)' }
        ];
        for (const t of initialTanks) await addDoc(collection(db, getCollectionPath('tanks')), t);
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
        for (const item of initialInventory) await addDoc(collection(db, getCollectionPath('inventory')), item);
      }

      const clientSnap = await getDocs(collection(db, getCollectionPath('clients')));
      if (clientSnap.empty) {
        const initialClients: Omit<Client, 'id'>[] = [
          { name: 'Enoteca Antichi Sapori', email: 'info@antichisapori.it', phone: '0824 555123', city: 'Benevento' },
          { name: 'Ristorante Il Grappolo d\'Oro', email: 'prenotazioni@grappolodoro.com', phone: '02 4433221', city: 'Milano' },
          { name: 'Distribuzione Campania Vini', email: 'commerciale@campaniavini.it', phone: '081 776655', city: 'Napoli' }
        ];
        for (const c of initialClients) await addDoc(collection(db, getCollectionPath('clients')), c);
      }

      const todoSnap = await getDocs(collection(db, getCollectionPath('todos')));
      if (todoSnap.empty) {
        const initialTodos: Omit<TodoTask, 'id'>[] = [
          { title: 'Verificare pulizia ed igienizzazione della tubazione di imbottigliamento', status: 'DA_FARE' },
          { title: 'Inviare campione Aglianico Riserva per analisi esterne pre-imbottigliamento', status: 'DA_FARE' },
          { title: 'Contattare enoteca Antichi Sapori per accordo spedizione', status: 'COMPLETATO' }
        ];
        for (const t of initialTodos) await addDoc(collection(db, getCollectionPath('todos')), t);
      }
    } catch (err) {
      console.error("Errore durante la creazione dei dati dimostrativi:", err);
    }
  };

  // ======================= FUNZIONI OPERATIVE =======================
  // Serbatoi
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
        await updateDoc(doc(db, getCollectionPath('todos'), associatedTodo.id), { status: 'COMPLETATO' });
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

  // Clienti / Ordini
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

  // TODO
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
      await updateDoc(doc(db, getCollectionPath('todos'), task.id), { status: nextStatusMap[task.status] });
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

  // Magazzino item
  const handleCreateInventoryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name || newItem.quantity < 0) return;
    try {
      await addDoc(collection(db, getCollectionPath('inventory')), { ...newItem, quantity: Number(newItem.quantity) });
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

  // ======================= RENDER =======================
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9FB] p-4">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-red-950">Vigne di Malies</h1>
            <p className="text-sm text-gray-500 mt-2">Accedi per gestire la cantina</p>
          </div>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="w-full py-4 bg-red-950 text-white font-bold rounded-xl shadow-lg hover:bg-red-900 transition"
          >
            Accedi con Email/Password
          </button>
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLogin={handleLogin}
            onRegister={handleRegister}
          />
        </div>
      </div>
    );
  }

  // Utente autenticato: interfaccia completa con sidebar e moduli
  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F9F9FB] text-[#1E1E24] font-sans overflow-hidden">
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Sidebar e header mobile (visibili solo quando non siamo nell'HUB) */}
      {activeArea !== 'HUB' && (
        <>
          {/* Header mobile */}
          <div className="md:hidden bg-white border-b border-[#EBEBEF] px-4 py-3 flex items-center justify-between z-40 shrink-0">
            <button
              onClick={() => setActiveArea('HUB')}
              className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-red-950"
            >
              <ChevronLeft className="w-4 h-4" /> Home
            </button>
            <h1 className="font-extrabold text-sm text-red-950 uppercase tracking-wider">{activeArea}</h1>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg border border-[#EBEBEF] text-gray-700 bg-gray-50 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Sidebar */}
          <aside className={`
            fixed md:relative top-0 bottom-0 left-0 w-80 bg-white border-r border-[#EBEBEF] flex flex-col justify-between shrink-0 z-50 transition-transform duration-300
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}>
            <div>
              <div className="p-5 border-b border-[#F4F4F6] space-y-4">
                <button
                  onClick={() => { setActiveArea('HUB'); setIsMobileMenuOpen(false); }}
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

              <nav className="p-4 space-y-1.5">
                {activeArea === 'CANTINA' && (
                  <>
                    <button onClick={() => { setCantinaSubView('SERBATOI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${cantinaSubView === 'SERBATOI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Wine className="w-4 h-4" /> Mappa Serbatoi
                    </button>
                    <button onClick={() => { setCantinaSubView('ANALISI_STORICO'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${cantinaSubView === 'ANALISI_STORICO' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Activity className="w-4 h-4" /> Registro Analisi & Laboratorio
                    </button>
                  </>
                )}
                {activeArea === 'MAGAZZINO' && (
                  <>
                    <button onClick={() => { setMagazzinoSubView('INVENTARIO'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${magazzinoSubView === 'INVENTARIO' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Package className="w-4 h-4" /> Inventario Materiali
                    </button>
                    <button onClick={() => { setMagazzinoSubView('PROCESSI_ATTIVI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${magazzinoSubView === 'PROCESSI_ATTIVI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Activity className="w-4 h-4" /> Lotti in Imbottigliamento
                    </button>
                  </>
                )}
                {activeArea === 'VENDITE' && (
                  <>
                    <button onClick={() => { setVenditeSubView('CLIENTI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${venditeSubView === 'CLIENTI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Users className="w-4 h-4" /> Anagrafica Clienti
                    </button>
                    <button onClick={() => { setVenditeSubView('ORDINI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${venditeSubView === 'ORDINI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <FileText className="w-4 h-4" /> Ordini ed Evasioni
                    </button>
                  </>
                )}
                {activeArea === 'TODO' && (
                  <>
                    <button onClick={() => { setTodoSubView('ATTIVI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${todoSubView === 'ATTIVI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <ListTodo className="w-4 h-4" /> Promemoria Attivi
                    </button>
                    <button onClick={() => { setTodoSubView('COMPLETATI'); setIsMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-lg transition-all ${todoSubView === 'COMPLETATI' ? 'bg-red-950 text-white shadow-md' : 'text-[#5E5E6E] hover:bg-[#F4F4F6]'}`}>
                      <Check className="w-4 h-4" /> Storico Completati
                    </button>
                  </>
                )}
              </nav>
            </div>

            {isMobileMenuOpen && (
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden m-4 p-3 bg-red-950 text-white rounded-lg font-bold text-center text-xs">
                Chiudi Menù
              </button>
            )}

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

          {isMobileMenuOpen && (
            <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/40 z-40 md:hidden" />
          )}
        </>
      )}

      {/* Contenuto principale */}
      <main className="flex-1 overflow-auto p-4 md:p-8 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 text-red-950 animate-spin mb-4" />
            <p className="text-sm font-bold text-gray-500">Inizializzazione database Vigne di Malies...</p>
          </div>
        ) : (
          <>
            {activeArea === 'HUB' && (
              <Dashboard
                activeTodosCount={todos.filter(t => t.status !== 'COMPLETATO').length}
                onNavigate={(area) => {
                  setActiveArea(area);
                  if (area === 'CANTINA') setCantinaSubView('SERBATOI');
                  if (area === 'MAGAZZINO') setMagazzinoSubView('INVENTARIO');
                  if (area === 'VENDITE') setVenditeSubView('CLIENTI');
                  if (area === 'TODO') setTodoSubView('ATTIVI');
                }}
              />
            )}

            {activeArea === 'CANTINA' && (
              <Cantina
                cantinaSubView={cantinaSubView}
                setCantinaSubView={setCantinaSubView}
                tanks={tanks}
                isAddingTank={isAddingTank}
                setIsAddingTank={setIsAddingTank}
                newTank={newTank}
                setNewTank={setNewTank}
                handleCreateTank={handleCreateTank}
                activeAnalysisTank={activeAnalysisTank}
                setActiveAnalysisTank={setActiveAnalysisTank}
                analysisData={analysisData}
                setAnalysisData={setAnalysisData}
                handleSaveAnalysis={handleSaveAnalysis}
                activeBottlingTank={activeBottlingTank}
                setActiveBottlingTank={setActiveBottlingTank}
                bottlingLiters={bottlingLiters}
                setBottlingLiters={setBottlingLiters}
                handleStartBottling={handleStartBottling}
              />
            )}

            {activeArea === 'MAGAZZINO' && (
              <Magazzino
                magazzinoSubView={magazzinoSubView}
                setMagazzinoSubView={setMagazzinoSubView}
                inventory={inventory}
                isLabelingModalOpen={isLabelingModalOpen}
                setIsLabelingModalOpen={setIsLabelingModalOpen}
                labelingSource={labelingSource}
                setLabelingSource={setLabelingSource}
                labelingQty={labelingQty}
                setLabelingQty={setLabelingQty}
                labelingRecipe={labelingRecipe}
                setLabelingRecipe={setLabelingRecipe}
                handleLabelingProcess={handleLabelingProcess}
                isAddingItem={isAddingItem}
                setIsAddingItem={setIsAddingItem}
                newItem={newItem}
                setNewItem={setNewItem}
                handleCreateInventoryItem={handleCreateInventoryItem}
                bottlings={bottlings}
                activeCompleteBottling={activeCompleteBottling}
                setActiveCompleteBottling={setActiveCompleteBottling}
                actualBottlesCount={actualBottlesCount}
                setActualBottlesCount={setActualBottlesCount}
                handleCompleteBottling={handleCompleteBottling}
                handleQuickAddStock={handleQuickAddStock}
              />
            )}

            {activeArea === 'VENDITE' && (
              <Vendite
                venditeSubView={venditeSubView}
                setVenditeSubView={setVenditeSubView}
                clients={clients}
                orders={orders}
                inventory={inventory}
                isAddingClient={isAddingClient}
                setIsAddingClient={setIsAddingClient}
                newClient={newClient}
                setNewClient={setNewClient}
                handleCreateClient={handleCreateClient}
                isAddingOrder={isAddingOrder}
                setIsAddingOrder={setIsAddingOrder}
                newOrder={newOrder}
                setNewOrder={setNewOrder}
                handleCreateOrder={handleCreateOrder}
                renderDate={renderDate}
              />
            )}

            {activeArea === 'TODO' && (
              <Todo
                todoSubView={todoSubView}
                setTodoSubView={setTodoSubView}
                todos={todos}
                isAddingTodo={isAddingTodo}
                setIsAddingTodo={setIsAddingTodo}
                newTodo={newTodo}
                setNewTodo={setNewTodo}
                handleCreateTodo={handleCreateTodo}
                toggleTodoStatus={toggleTodoStatus}
                handleDeleteTodo={handleDeleteTodo}
                bottlings={bottlings}
                orders={orders}
                renderDate={renderDate}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}
