import { NavLink, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "@/firebase";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import {
  Warehouse,
  ShoppingCart,
  CheckSquare,
  LogOut,
  FlaskConical,
  Leaf,
  BarChart3,
  Wine,
} from "lucide-react";

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  disabled?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    to: "/",
    icon: <BarChart3 size={18} />,
  },
  {
    label: "Gestione Vigneto",
    to: "/vigneto",
    icon: <Leaf size={18} />,
    disabled: true,
  },
  {
    label: "Cantina & Vasi",
    to: "/cantina",
    icon: <Wine size={18} />,
  },
  {
    label: "Magazzino",
    to: "/magazzino",
    icon: <Warehouse size={18} />,
  },
  {
    label: "Produzione",
    to: "/produzione",
    icon: <FlaskConical size={18} />,
  },
  {
    label: "Vendite & Ordini",
    to: "/vendite",
    icon: <ShoppingCart size={18} />,
  },
  {
    label: "Cose da Fare",
    to: "/todo",
    icon: <CheckSquare size={18} />,
  },
];

export default function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();

  async function handleLogout() {
    await signOut(auth);
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col bg-stone-900 text-stone-100 shrink-0">
      {/* Brand */}
      <div className="px-6 py-7 border-b border-stone-700/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-wine-700 rounded-xl flex items-center justify-center shadow-wine shrink-0">
            <span className="text-base">🍷</span>
          </div>
          <div>
            <div className="font-display text-base text-white leading-tight">Vigne di Malies</div>
            <div className="text-[10px] text-stone-400 uppercase tracking-wider">Gestionale</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.disabled) {
            return (
              <div
                key={item.to}
                title="Funzione in fase di sviluppo futuro"
                className="group relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                           text-stone-600 cursor-not-allowed select-none"
              >
                <span className="shrink-0 opacity-50">{item.icon}</span>
                <span className="text-sm font-body opacity-50">{item.label}</span>
                <span className="ml-auto text-[9px] bg-stone-800 text-stone-500 px-1.5 py-0.5 rounded font-mono uppercase tracking-wide">
                  WIP
                </span>
                {/* Tooltip */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-stone-800 text-stone-200 text-xs
                                rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none
                                group-hover:opacity-100 transition-opacity z-50 w-52 leading-snug">
                  🚧 Funzione in fase di sviluppo futuro
                </div>
              </div>
            );
          }

          const isActive = item.to === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.to);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-wine-700/90 text-white shadow-wine"
                  : "text-stone-400 hover:text-stone-100 hover:bg-stone-800/60"
              )}
            >
              <span className={cn(
                "shrink-0 transition-transform duration-150",
                !isActive && "group-hover:scale-110"
              )}>
                {item.icon}
              </span>
              <span className="text-sm font-body font-medium">{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-wine-600 text-white text-[10px] font-mono
                                 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-5 border-t border-stone-700/60">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-wine-800 flex items-center justify-center text-xs text-white font-display shrink-0">
            {user?.email?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-stone-300 truncate">
              {user?.displayName || user?.email || "Utente"}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg
                     text-stone-500 hover:text-stone-200 hover:bg-stone-800/60
                     transition-all duration-150 text-sm font-body"
        >
          <LogOut size={15} />
          Esci
        </button>
      </div>
    </aside>
  );
}
