import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password") {
        setError("Email o password non corretti.");
      } else if (e.code === "auth/user-not-found") {
        setError("Nessun account trovato con questa email.");
      } else {
        setError("Errore di accesso. Riprovare.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-100 relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-wine-100 rounded-full blur-3xl opacity-40 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-terracotta-100 rounded-full blur-3xl opacity-40 translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-4">
        {/* Logo / Brand */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-wine-700 rounded-2xl shadow-wine mb-5">
            <span className="text-2xl">🍷</span>
          </div>
          <h1 className="font-display text-3xl text-stone-800 mb-1">Vigne di Malies</h1>
          <p className="text-stone-500 text-sm font-body">Gestionale Vitivinicolo</p>
        </div>

        {/* Card login */}
        <div className="card-base p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label-base">Email</label>
              <input
                type="email"
                className="input-base"
                placeholder="nome@malies.it"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label-base">Password</label>
              <input
                type="password"
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : null}
              {loading ? "Accesso in corso…" : "Accedi"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-stone-400 mt-6 font-body">
          © {new Date().getFullYear()} Vigne di Malies — Tutti i diritti riservati
        </p>
      </div>
    </div>
  );
}
