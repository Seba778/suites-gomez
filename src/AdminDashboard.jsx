import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, Calendar } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000'
  : 'https://suites-gomez-production-33ea.up.railway.app';

const EVENTS = [
  { id: "26-sep-2026", name: "26 Sep - Stage Night" }
];

const CATEGORY_MAP = {
  "RED TABLES":  "MesaRoja",
  "BLUE TABLES": "MesaAzul",
  "GOLD TABLES": "MesaGold",
};

// No suites for this event
const tablesGroups = {
  "GOLD TABLES": { numeros: Array.from({ length: 10 }, (_, i) => i + 1),      locked: true  },
  "RED TABLES":  { numeros: Array.from({ length: 20 }, (_, i) => i + 11),     locked: false },
  "BLUE TABLES": { numeros: Array.from({ length: 30 }, (_, i) => i + 31),     locked: false },
};

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].id);
  const [occupiedData, setOccupiedData] = useState({ suites: [], mesas: [] });
  const [loading, setLoading] = useState(false);

  const ADMIN_PASS_FRONT = 'Kirk2026';

  useEffect(() => {
    if (isAuthenticated) fetchOccupied();
  }, [selectedEvent, isAuthenticated]);

  const fetchOccupied = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/occupied?eventId=${selectedEvent}`);
      const data = await res.json();
      setOccupiedData(data);
    } catch (error) {
      console.error("Error cargando ocupación:", error);
      alert("Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    if (password === ADMIN_PASS_FRONT) setIsAuthenticated(true);
    else alert("Contraseña incorrecta");
  };

  const toggleItem = async (type, numero, category) => {
    const internalCategory = CATEGORY_MAP[category];
    const isOccupied = checkOccupied(type, numero, category);
    if (isOccupied && !window.confirm(`¿Seguro que querés liberar Table #${numero}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminKey: password, type, numero, eventId: selectedEvent, category: internalCategory })
      });
      const json = await res.json();
      if (!res.ok) alert("Error: " + json.error);
      else fetchOccupied();
    } catch (error) {
      alert("Error de red");
    }
  };

  const checkOccupied = (type, numStr, category) => {
    const list = occupiedData.mesas;
    const internalCat = CATEGORY_MAP[category];
    return list.some(item => item.numero === numStr.toString() && item.category === internalCat);
  };

  const totalMesas  = 60;
  const ocupadasMesas = occupiedData.mesas?.length || 0;

  // ── LOGIN ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
        <div className="bg-black/50 p-8 rounded-3xl border border-amber-600/30 text-center space-y-6 max-w-md w-full">
          <ShieldCheck className="w-16 h-16 text-amber-600 mx-auto" />
          <h1 className="text-2xl font-bold text-white uppercase tracking-widest">Acceso Restringido</h1>
          <input
            type="password"
            placeholder="Contraseña Maestra"
            className="w-full bg-stone-800 border border-stone-600 p-3 rounded-xl text-white text-center text-lg focus:border-amber-500 outline-none"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-wider">
            Entrar al Panel
          </button>
        </div>
      </div>
    );
  }

  // ── DASHBOARD ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0a09] text-white p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6 border-b border-white/10 pb-6">
          <div className="flex items-center gap-4">
            <ShieldCheck className="w-10 h-10 text-amber-600" />
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter">Panel de Control</h1>
              <p className="text-stone-400 text-xs tracking-widest">Gomez Western Wear Arena</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-stone-900 p-2 rounded-2xl border border-white/10">
            <Calendar className="text-amber-600 ml-2" />
            <select
              value={selectedEvent}
              onChange={e => setSelectedEvent(e.target.value)}
              className="bg-transparent text-white font-bold outline-none p-2"
            >
              {EVENTS.map(ev => (
                <option key={ev.id} value={ev.id} className="bg-stone-900">{ev.name}</option>
              ))}
            </select>
          </div>
        </header>

        {/* RESUMEN */}
        <div className="grid grid-cols-2 gap-4 mb-10 max-w-sm">
          <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Tables Ocupadas</p>
            <p className="text-3xl font-black text-red-500">{ocupadasMesas}</p>
            <p className="text-[10px] text-stone-600 mt-1">de {totalMesas} totales</p>
          </div>
          <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Tables Libres</p>
            <p className="text-3xl font-black text-green-500">{totalMesas - ocupadasMesas}</p>
            <p className="text-[10px] text-stone-600 mt-1">disponibles</p>
          </div>
        </div>

        {/* LOADING */}
        {loading && (
          <div className="text-center text-amber-500 animate-pulse mb-4 text-[11px] uppercase tracking-widest">
            Actualizando datos...
          </div>
        )}

        {/* LEYENDA */}
        <div className="flex items-center gap-6 mb-6 text-[10px] uppercase tracking-widest text-stone-500">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-green-600 inline-block"/>Libre — click para bloquear</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm bg-red-600 inline-block"/>Ocupado — click para liberar</span>
        </div>

        {/* TABLE GROUPS */}
        <div className="space-y-12">
          {Object.keys(tablesGroups).map(catName => {
            const grp = tablesGroups[catName];
            const colorClass = catName === 'GOLD TABLES' ? 'text-yellow-500' : catName === 'RED TABLES' ? 'text-red-400' : 'text-blue-400';
            const borderClass = catName === 'GOLD TABLES' ? 'border-yellow-600' : catName === 'RED TABLES' ? 'border-red-600' : 'border-blue-600';
            const subtitle = catName === 'GOLD TABLES' ? '10 tables · Contact us · Special pricing'
              : catName === 'RED TABLES' ? '20 tables · $700 USD · 4 seats'
              : '30 tables · $600 USD · 4 seats';

            return (
              <div key={catName} className="bg-stone-900/50 p-8 rounded-[2rem] border border-white/5">
                <h3 className={`font-bold uppercase tracking-widest mb-2 border-l-4 pl-4 ${colorClass} ${borderClass}`}>
                  {catName}
                </h3>
                <p className="text-stone-600 text-[10px] uppercase tracking-widest mb-6 pl-4">{subtitle}</p>
                <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-3">
                  {grp.numeros.map(num => {
                    if (grp.locked) {
                      return (
                        <div key={num} className="aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center border-2 border-yellow-600/30 bg-yellow-900/10 text-yellow-600/50 cursor-not-allowed">
                          <span className="text-base">{num}</span>
                          <Lock size={10} className="mt-0.5"/>
                        </div>
                      );
                    }
                    const isBlocked = checkOccupied('table', num, catName);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleItem('table', num, catName)}
                        className={`aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all border-2
                          ${isBlocked
                            ? 'bg-red-900/20 border-red-600 text-red-500 hover:bg-red-900/40'
                            : catName === 'RED TABLES'
                              ? 'bg-red-900/10 border-red-600/50 text-red-400 hover:bg-red-900/30'
                              : 'bg-blue-900/10 border-blue-600/50 text-blue-400 hover:bg-blue-900/30'
                          }`}
                      >
                        <span className="text-base">{num}</span>
                        <span className="text-[8px] uppercase mt-0.5">{isBlocked ? 'Ocupado' : 'Libre'}</span>
                        {isBlocked ? <Lock size={10} className="mt-0.5"/> : <Unlock size={10} className="mt-0.5"/>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}