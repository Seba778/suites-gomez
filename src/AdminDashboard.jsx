import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Unlock, AlertTriangle, Calendar, CheckCircle2 } from 'lucide-react';

// --- TUS DATOS REALES ---
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000'  // Tu puerto local (verifica si usas 4000)
  : 'https://suites-gomez-production.up.railway.app'; // Tu URL real
const EVENTS = [
  { id: "15-feb-2026", name: "15 Feb - Primer Jaripeo" },
  { id: "20-feb-2026", name: "20 Feb - Alameños" }
];

const CATEGORY_MAP = {
  "MESAS GOLD": "MesaVipGold",
  "MESAS SILVER": "MesaVipSilver"
};

const suitesData = {
  "Verde Suite Gold": ["350", "332", "330", "326", "324", "316", "314", "312", "308", "306", "304", "302", "301", "305", "307", "309", "378"],
  "Amarillo Suite Premium": ["372", "315"]
};

const tablesGroups = {
  "MESAS GOLD": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17],
  "MESAS SILVER": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
};

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(EVENTS[0].id);
  const [activeTab, setActiveTab] = useState('suites'); // 'suites' | 'mesas'
  const [occupiedData, setOccupiedData] = useState({ suites: [], mesas: [] });
  const [loading, setLoading] = useState(false);

  // CLAVE TEMPORAL DEL FRONTEND (Cámbiala si quieres)
  const ADMIN_PASS_FRONT = 'Kirk2026'; 

  // Cargar datos al cambiar de evento
  useEffect(() => {
    if (isAuthenticated) fetchOccupied();
  }, [selectedEvent, isAuthenticated]);

  const fetchOccupied = async () => {
    setLoading(true);
    try {
      // Usamos tu endpoint existente
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
    // Si es mesa, convertimos la categoría visual a interna
    const internalCategory = type === 'table' ? CATEGORY_MAP[category] : category;
    
    // Optimistic UI (Feedback inmediato visual antes de respuesta del server)
    const isOccupied = checkOccupied(type, numero, category);
    
    if (isOccupied && !window.confirm(`¿Seguro que quieres liberar ${type} #${numero}?`)) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminKey: password, // Enviamos la misma pass (debe coincidir en .env del server o el default)
          type,
          numero,
          eventId: selectedEvent,
          category: internalCategory
        })
      });

      const json = await res.json();
      
      if (!res.ok) {
        alert("Error: " + json.error);
      } else {
        // Recargar datos para confirmar cambio real
        fetchOccupied();
      }
    } catch (error) {
      alert("Error de red");
    }
  };

  const checkOccupied = (type, numStr, category) => {
    const list = type === 'suite' ? occupiedData.suites : occupiedData.mesas;
    const internalCat = type === 'table' ? CATEGORY_MAP[category] : category;
    
    // Buscamos coincidencia exacta
    return list.some(item => 
      item.numero === numStr.toString() && item.category === internalCat
    );
  };

  // --- RENDER ---
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
          />
          <button onClick={handleLogin} className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl transition-all uppercase tracking-wider">
            Entrar al Panel
          </button>
        </div>
      </div>
    );
  }

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
            Mesas Numeradas
          </button>
        </div>

        {/* LOADING */}
        {loading && <div className="text-center text-amber-500 animate-pulse mb-4">Actualizando datos...</div>}

        {/* CONTENT */}
        <div className="space-y-12">
          {activeTab === 'suites' ? (
            // VISTA SUITES
            Object.keys(suitesData).map(catName => (
              <div key={catName} className="bg-stone-900/50 p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-amber-500 font-bold uppercase tracking-widest mb-6 border-l-4 border-amber-600 pl-4">{catName}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {suitesData[catName].map(num => {
                    const isBlocked = checkOccupied('suite', num, catName);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleItem('suite', num, catName)}
                        className={`aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all border-2 relative group
                          ${isBlocked 
                            ? 'bg-red-900/20 border-red-600 text-red-500 hover:bg-red-900/40' 
                            : 'bg-green-900/20 border-green-600 text-green-500 hover:bg-green-900/40'
                          }`}
                      >
                        <span className="text-lg">{num}</span>
                        <span className="text-[9px] uppercase mt-1">{isBlocked ? 'Ocupado' : 'Libre'}</span>
                        {isBlocked ? <Lock size={12} className="mt-1"/> : <Unlock size={12} className="mt-1"/>}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))
          ) : (
            // VISTA MESAS
            Object.keys(tablesGroups).map(catName => (
              <div key={catName} className="bg-stone-900/50 p-8 rounded-[2rem] border border-white/5">
                <h3 className="text-amber-500 font-bold uppercase tracking-widest mb-6 border-l-4 border-amber-600 pl-4">{catName}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
                  {tablesGroups[catName].map(num => {
                    const isBlocked = checkOccupied('table', num, catName);
                    return (
                      <button
                        key={num}
                        onClick={() => toggleItem('table', num, catName)}
                        className={`aspect-square rounded-xl font-black text-sm flex flex-col items-center justify-center transition-all border-2 relative group
                          ${isBlocked 
                            ? 'bg-red-900/20 border-red-600 text-red-500 hover:bg-red-900/40' 
                            : 'bg-green-900/20 border-green-600 text-green-500 hover:bg-green-900/40'
                          }`}
                      >
                        <span className="text-lg">{num}</span>
                        <span className="text-[9px] uppercase mt-1">{isBlocked ? 'Ocupado' : 'Libre'}</span>
                        {isBlocked ? <Lock size={12} className="mt-1"/> : <Unlock size={12} className="mt-1"/>}
                      </button>
                    )
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