import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, Calendar } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000'
  : 'https://suites-gomez-production.up.railway.app';

const EVENTS = [
  { id: "26-jun-2026", name: "26 Jun - JBF Nations Cup 2026" }
];

const CATEGORY_MAP = {
  "VIP TABLES": "MesaVipGold"
};

// ✅ Nombres y números sincronizados con App.jsx
const suitesData = {
  "Suite 10 People": ["320","318","316","314","312","310","308","306","304","302","301","305","307","309","360","362"],
  "Suite 20 People": ["364"],
};

const tablesGroups = {
  "VIP TABLES": Array.from({ length: 30 }, (_, i) => i + 1)
};

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].id);
  const [activeTab, setActiveTab] = useState('suites');
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
    if (password === ADMIN_PASS_FRONT) {
      setIsAuthenticated(true);
    } else {
      alert("Contraseña incorrecta");
    }
  };

  const toggleItem = async (type, numero, category) => {
    const internalCategory = type === 'table' ? CATEGORY_MAP[category] : category;
    const isOccupied = checkOccupied(type, numero, category);
    if (isOccupied && !window.confirm(`¿Seguro que querés liberar ${type === 'suite' ? 'Suite' : 'Table'} #${numero}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: password,
          type,
          numero,
          eventId: selectedEvent,
          category: internalCategory
        })
      });
      const json = await res.json();
      if (!res.ok) alert("Error: " + json.error);
      else fetchOccupied();
    } catch (error) {
      alert("Error de red");
    }
  };

  const checkOccupied = (type, numStr, category) => {
    const list = type === 'suite' ? occupiedData.suites : occupiedData.mesas;
    const internalCat = type === 'table' ? CATEGORY_MAP[category] : category;
    return list.some(item => item.numero === numStr.toString() && item.category === internalCat);
  };

  const totalSuites = Object.values(suitesData).flat().length;
  const totalMesas  = Object.values(tablesGroups).flat().length;
  const ocupadasSuites = occupiedData.suites?.length || 0;
  const ocupadasMesas  = occupiedData.mesas?.length  || 0;

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Suites Ocupadas</p>
            <p className="text-3xl font-black text-red-500">{ocupadasSuites}</p>
            <p className="text-[10px] text-stone-600 mt-1">de {totalSuites} totales</p>
          </div>
          <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-5 text-center">
            <p className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Suites Libres</p>
            <p className="text-3xl font-black text-green-500">{totalSuites - ocupadasSuites}</p>
            <p className="text-[10px] text-stone-600 mt-1">disponibles</p>
          </div>
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

        {/* TABS */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('suites')}
            className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all ${activeTab === 'suites' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'bg-stone-900 text-stone-500 border border-white/5'}`}
          >
            Suites VIP
          </button>
          <button 
            onClick={() => setActiveTab('mesas')}
            className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all ${activeTab === 'mesas' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/50' : 'bg-stone-900 text-stone-500 border border-white/5'}`}
          >
            VIP Tables
          </button>
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

        {/* CONTENT */}
        <div className="space-y-12">
          {activeTab === 'suites' ? (
            Object.keys(suitesData).map(catName => (
              <div key={catName} className="bg-stone-900/50 p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-amber-500 font-bold uppercase tracking-widest mb-2 border-l-4 border-amber-600 pl-4">
                  {catName}
                </h3>
                <p className="text-stone-600 text-[10px] uppercase tracking-widest mb-6 pl-4">
                  {catName === "Suite 10 People"
                    ? "16 suites · $2,000 USD · 10 people"
                    : "1 suite · $4,000 USD · 20 people"}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {suitesData[catName].map(num => {
                    const isBlocked = checkOccupied('suite', num, catName);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleItem('suite', num, catName)}
                        className={`aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all border-2 
                          ${isBlocked 
                            ? 'bg-red-900/20 border-red-600 text-red-500 hover:bg-red-900/40' 
                            : 'bg-green-900/20 border-green-600 text-green-500 hover:bg-green-900/40'
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
            ))
          ) : (
            Object.keys(tablesGroups).map(catName => (
              <div key={catName} className="bg-stone-900/50 p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-amber-500 font-bold uppercase tracking-widest mb-2 border-l-4 border-amber-600 pl-4">
                  {catName}
                </h3>
                <p className="text-stone-600 text-[10px] uppercase tracking-widest mb-6 pl-4">
                  30 tables · $600 USD · 4 seats
                </p>
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
                  {tablesGroups[catName].map(num => {
                    const isBlocked = checkOccupied('table', num, catName);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleItem('table', num, catName)}
                        className={`aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all border-2 
                          ${isBlocked 
                            ? 'bg-red-900/20 border-red-600 text-red-500 hover:bg-red-900/40' 
                            : 'bg-green-900/20 border-green-600 text-green-500 hover:bg-green-900/40'
                          }`}
                      >
                        <span className="text-lg">{num}</span>
                        <span className="text-[9px] uppercase mt-1">{isBlocked ? 'Ocupado' : 'Libre'}</span>
                        {isBlocked ? <Lock size={12} className="mt-1"/> : <Unlock size={12} className="mt-1"/>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}