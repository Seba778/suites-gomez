import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js'; 
import { MapPin, Crown, Star, Coffee, Car, ShieldCheck, ArrowRight, CheckCircle2, Calendar, Play, X, Users, Target, Eye, Gem } from 'lucide-react';

import { vipTables } from './mesasData';
import Success from './Success'; 

const stripePromise = loadStripe('pk_live_51SoV9yRqCWGV92H1MaeHgtUiis4SfVjJ8Z5WEN6H2sFLoZtdnHu7LrU1qCoTuCYAApEgUivuTYVbdhwFMqHydtFq00lgEpDiQS');
const API_URL = 'https://suites-gomez-production.up.railway.app';

// ✅ MAPEO DE CATEGORÍAS VISUALES A INTERNAS
const CATEGORY_MAP = {
  "MESAS GOLD": "MesaVipGold",
  "MESAS SILVER": "MesaVipSilver"
};

const EVENTS = {
  "15-feb-2026": {
    id: "15-feb-2026",
    name: "PRIMER JARIPEO DEL AÑO",
    date: "Domingo 15 de Febrero",
    location: "1818 Rodeo Dr, Mesquite, TX",
    description: "Ha regresado la verdadera tradición mexicana",
    image: "/evento-febrero.jpg"
  },
  "20-feb-2026": {
    id: "20-feb-2026",
    name: "ALAMEÑOS DE LA SIERRA & LOS INDOMABLES",
    date: "Viernes 20 de Febrero",
    location: "1818 Rodeo Dr, Mesquite, TX",
    description: "Cinco agrupaciones, una sola noche de puro poder norteño",
    image: "/evento2.jpg"
  }
};

function MainLanding() {
  const [scrolled, setScrolled] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedTableCategory, setSelectedTableCategory] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [occupancyData, setOccupancyData] = useState({
    "15-feb-2026": { suites: [], mesas: [] },
    "20-feb-2026": { suites: [], mesas: [] }
  });
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  // ✅ HELPER: Verificar si suite está ocupada en un evento específico
  const isSuiteOccupied = (suiteNumber, category, eventId = currentEventId) => {
    if (!eventId) return false;
    return occupancyData[eventId].suites.some(
      s => s.numero === suiteNumber.toString() && s.category === category
    );
  };

  // ✅ HELPER: Verificar si mesa está ocupada con CATEGORÍA INTERNA
  const isTableOccupied = (tableNumber, visualCategory, eventId = currentEventId) => {
    if (!eventId) return false;
    const internalCategory = CATEGORY_MAP[visualCategory]; // Convierte "MESAS GOLD" a "MesaVipGold"
    return occupancyData[eventId].mesas.some(
      t => t.numero === tableNumber.toString() && t.category === internalCategory
    );
  };

  // ✅ CARGAR UN EVENTO ESPECÍFICO
  const cargarOcupadosPorEvento = async (eventId) => {
    try {
      const response = await fetch(`${API_URL}/api/occupied?eventId=${eventId}`);
      const data = await response.json();
      console.log(`📊 Ocupados para ${eventId}:`, data);
      setOccupancyData(prev => ({
        ...prev,
        [eventId]: {
          suites: data.suites || [],
          mesas: data.mesas || []
        }
      }));
    } catch (error) {
      console.error(`Error al obtener ocupados de ${eventId}:`, error);
    }
  };

  // ✅ CARGAR AMBOS EVENTOS
  const cargarAmbosEventos = async () => {
    setLoadingOccupancy(true);
    try {
      await Promise.all([
        cargarOcupadosPorEvento("15-feb-2026"),
        cargarOcupadosPorEvento("20-feb-2026")
      ]);
    } finally {
      setLoadingOccupancy(false);
    }
  };

  // ✅ EFECTO: Cargar ambos eventos cuando se abre el modal
  useEffect(() => {
    if (currentEventId) {
      cargarAmbosEventos();
      const intervalo = setInterval(cargarAmbosEventos, 3000);
      return () => clearInterval(intervalo);
    }
  }, [currentEventId]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const openReservationModal = (eventId, eventName) => {
    setCurrentEventId(eventId);
    setSelectedEvent(eventName);
  };

  const closeReservationModal = () => {
    setSelectedEvent(null);
    setCurrentEventId(null);
    setSelectedNumber("");
    setSelectedTable(null);
    setSelectedTableCategory(null);
    setSelectedColor(null);
  };

  const handlePayment = async () => {
    if (!selectedNumber) return alert("Selecciona un número de suite");
    if (!currentEventId) return alert("Selecciona un evento");
    if (!selectedColor) return alert("Selecciona una categoría de suite");

    try {
      console.log(`💳 Iniciando pago: Suite #${selectedNumber}, Evento: ${currentEventId}, Categoría: ${selectedColor}`);
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          suiteNumber: selectedNumber.toString(),
          category: selectedColor,
          eventId: currentEventId,
          isTable: false
        }),
      });

      const session = await response.json();
      if (session.error) {
        alert(`Error: ${session.error}`);
        return;
      }
      if (session.url) {
        console.log(`✅ Redirigiendo a Stripe para suite #${selectedNumber}`);
        window.location.href = session.url;
      } else {
        console.error("No se recibió URL de Stripe");
        alert("Error al procesar el pago");
      }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Error de conexión con el servidor");
    }
  };

  const handleTablePayment = async () => {
    if (!selectedTable) return alert("Por favor selecciona una mesa primero");
    if (!currentEventId) return alert("Selecciona un evento");
    if (!selectedTableCategory) return alert("Selecciona una categoría de mesa");

    try {
      // ✅ CRÍTICO: Convertir a categoría interna
      const internalCategory = CATEGORY_MAP[selectedTableCategory];
      
      console.log(`💳 Iniciando pago: Mesa #${selectedTable.id}, Evento: ${currentEventId}, Categoría: ${internalCategory}`);
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedTable.stripePriceId,
          isTable: true,
          tableNumber: selectedTable.id.toString(),
          category: internalCategory,  // ✅ ENVIAMOS CATEGORÍA INTERNA
          eventId: currentEventId
        }),
      });
      
      const session = await response.json();
      if (session.error) {
        alert(`Error: ${session.error}`);
        return;
      }
      if (session.url) {
        console.log(`✅ Redirigiendo a Stripe para mesa #${selectedTable.id}`);
        window.location.href = session.url;
      } else {
        console.error("No se recibió URL de Stripe para la mesa");
        alert("Error al procesar el pago");
      }
    } catch (error) {
      console.error("Error al procesar el pago de la mesa:", error);
      alert("Error conectando con el servidor");
    }
  };
  
  const suitesData = {
    "Verde Suite Gold": {
      color: "bg-[#7dbd7d]",
      numeros: ["350", "332", "330", "326", "324", "316", "314", "312", "308", "306", "304", "302", "301", "305", "307", "309", "378"],
      precioBase: 2500,
      detalles: "10 tickets + 2 parking + Fast Pass",
      icon: <Crown className="w-5 h-5 text-[#7dbd7d]" />
    },
    "Amarillo Suite Premium": {
      color: "bg-[#ffff00]",
      numeros: ["372", "315"],
      precioBase: 2000,
      detalles: "20 tickets + 4 parking + Fast Pass",
      icon: <Star className="w-5 h-5 text-yellow-400" />
    },
  };

  const tablesGroups = {
    "MESAS GOLD": {
      numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10 , 11, 12, 13, 14, 15, 16, 17],
      icon: <Gem className="w-5 h-5 text-amber-500" />
    },
    "MESAS SILVER": {
      numeros: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      icon: <Users className="w-5 h-5 text-stone-400" />
    }
  };

  return (
    <div className="min-h-screen bg-[#060504] text-white font-sans selection:bg-amber-600 overflow-x-hidden">
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'py-4 bg-black/90 backdrop-blur-xl border-b border-white/10' : 'py-8 bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="Logo" className={`rounded-full transition-all duration-500 border border-amber-600/30 ${scrolled ? 'h-10' : 'h-12'}`} />
            <div className="flex flex-col">
              <span className="font-black tracking-tighter text-lg md:text-xl uppercase leading-none">Gomez Western Wear</span>
              <span className="text-amber-600 font-bold text-[10px] tracking-[0.3em] uppercase">Arena Exclusive</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">
              <a href="#eventos" className="hover:text-amber-500 transition-colors">Eventos</a>
              <a href="#nosotros" className="hover:text-amber-500 transition-colors">Nosotros</a>
              <button onClick={() => openReservationModal("15-feb-2026", "Primer Jaripeo del Año")} className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-full transition-all">Reservar Suite</button>
          </div>
        </div>
      </nav>

      <header className="relative z-10 pt-32 md:pt-48 pb-10 text-center animate-fade-in">
        <h2 className="text-amber-500 font-bold tracking-[0.6em] uppercase text-[10px] md:text-xs mb-6 flex items-center justify-center gap-4">
          <div className="h-[1px] w-8 bg-amber-600"></div>
          Selección de Membresía Elite
          <div className="h-[1px] w-8 bg-amber-600"></div>
        </h2>
        <h1 className="text-6xl md:text-9xl font-black leading-[0.8] uppercase tracking-tighter mb-8">
          GOMEZ <span className="text-amber-600 italic">ARENA</span>
        </h1>
        <p className="text-stone-400 text-sm md:text-xl font-light italic max-w-2xl mx-auto px-6">
          "Bienvenido a Gómez Arena, aquí encontrarás la zona exclusiva para nuestros eventos, las suites están diseñadas para una experiencia inolvidable"
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-32 mt-16 pb-20">
        <section className="w-full">
          <div className="flex items-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-8">
            <Play size={14} fill="currentColor"/> Vista Previa de la Arena
          </div>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-white/10 aspect-video shadow-2xl">
            <video src="/estadio-preview.mp4" autoPlay muted loop className="w-full h-full object-cover scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
          </div>
        </section>

        <section id="eventos" className="w-full text-center">
          <div className="flex items-center justify-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-10">
            <Calendar size={16} /> Próximo Evento Destacado
          </div>
          <div 
            onClick={() => openReservationModal("15-feb-2026", "Primer Jaripeo del Año")}
            className="group relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-stone-900 cursor-pointer max-w-5xl mx-auto"
          >
            <img src="/evento-febrero.jpg" alt="Apertura" className="w-full h-[450px] md:h-[700px] object-cover transition-all duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-8 md:p-16 text-left">
              <span className="text-amber-500 font-black text-xs tracking-widest mb-4">DOMINGO 15 DE FEBRERO | 1818 Rodeo Dr, Mesquite, TX</span>
              <h4 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-6">PRIMER JARIPEO <br/> DEL AÑO</h4>
              <div className="space-y-4 max-w-2xl mb-8">
                <p className="text-stone-100 text-sm md:text-lg font-medium leading-relaxed">
                  ¡Ha regresado la verdadera tradición mexicana! La música se siente en el pecho con La Dinastía de Tuzantla, Banda Los Costeños de Zirandaro y más.
                </p>
                <p className="text-stone-400 text-xs md:text-sm font-light leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  Vive el enfrentamiento de los mejores jinetes con pura pata pesada contra toros bravos. Una experiencia de raíces profundas en el corazón de Texas.
                </p>
              </div>
              <div className="flex items-center gap-4 text-amber-500 font-bold text-xs uppercase tracking-widest group-hover:gap-6 transition-all">
                Reserva tu suite AHORA <ArrowRight size={18} />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full text-center">
          <div className="flex items-center justify-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-10">
            <Star size={16} /> Cartelera Exclusiva
          </div>
          <div 
            onClick={() => openReservationModal("20-feb-2026", "Poder Norteño en la Gomez Arena")}
            className="group relative rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl bg-stone-900 cursor-pointer max-w-5xl mx-auto min-h-[400px]"
          >
            <img src="/evento2.jpg" alt="Campeones" className="absolute inset-0 w-full h-full object-cover opacity-30 transition-all duration-1000 group-hover:scale-105 group-hover:opacity-60" />
            <div className="relative z-10 flex flex-col justify-center items-center text-center p-8 md:p-20">
              <span className="text-amber-500 font-bold text-xs uppercase tracking-[0.5em] mb-6 font-black">VIERNES 20 DE FEBRERO | DALLAS & FT WORTH</span>
              <h4 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter leading-none mb-8">ALAMEÑOS DE LA SIERRA <br/> & LOS INDOMABLES</h4>
              <div className="max-w-3xl space-y-4">
                <p className="text-stone-200 text-sm md:text-xl uppercase tracking-wider font-light">
                  Cinco agrupaciones, una sola noche de puro poder norteño.
                </p>
                <p className="text-stone-400 text-xs md:text-sm italic font-light opacity-0 group-hover:opacity-100 transition-all duration-500">
                  La Zenda Norteña, Banda Clave Nueva y Alfonso Cota se apoderan del escenario en 1818 Rodeo Drive. El evento que Dallas estaba esperando.
                </p>
              </div>
              <div className="mt-10 px-6 py-2 border border-amber-600/50 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-[0.3em]">Lugar VIP Reservado</div>
            </div>
          </div>
        </section>

        <section id="nosotros" className="relative rounded-[4rem] overflow-hidden border border-white/5 bg-stone-900/40 backdrop-blur-sm p-8 md:p-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-left">
              <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                SOBRE <span className="text-amber-600">NOSOTROS</span>
              </h2>
              <div className="h-1 w-24 bg-amber-600"></div>
              <p className="text-stone-300 text-lg leading-relaxed italic font-light">
                Gomez Western Wear Arena nació como un espacio único, diseñado para fusionar la elegancia moderna con el espíritu indomable de la cultura Western. Cada rincón de nuestra arena refleja un compromiso con la calidad y la hospitalidad de clase mundial.
              </p>

              <div className="grid grid-cols-2 gap-8 pt-6">
                <div>
                  <div className="text-amber-500 font-black text-4xl mb-1">10k+</div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-widest font-bold font-black">Capacidad Total</div>
                </div>
                <div>
                  <div className="text-amber-500 font-black text-4xl mb-1">50+</div>
                  <div className="text-stone-500 uppercase text-[10px] tracking-widest font-bold font-black">Suites de Lujo</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-4 mb-4 text-amber-600">
                  <Target size={28} />
                  <h4 className="text-xl font-black uppercase italic">Nuestra Misión</h4>
                </div>
                <p className="text-stone-400 leading-relaxed text-sm">Elevamos el estándar del entretenimiento Western, proporcionando una experiencia de hospitalidad inigualable que honra nuestras raíces mientras miramos hacia el futuro.</p>
              </div>

              <div className="bg-white/5 p-8 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4 mb-4 text-amber-600">
                  <Eye size={28} />
                  <h4 className="text-xl font-black uppercase italic">Nuestra Visión</h4>
                </div>
                <p className="text-stone-400 leading-relaxed text-sm">Ser reconocidos como el epicentro global del estilo de vida Western, donde la exclusividad y la pasión se encuentran bajo un mismo techo.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full text-center space-y-12">
            <div className="flex items-center justify-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em]">
              <Star size={16} fill="currentColor" /> Galería Exclusiva de Suites
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                 <div key={num} className="group relative rounded-[2rem] overflow-hidden border border-white/10 aspect-[4/3] bg-stone-900 shadow-xl">
                    <img src={`/suite-ejemplo${num}.jpg`} alt={`Suite ${num}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-black text-xs uppercase tracking-[0.3em] border border-white/20 px-4 py-2 rounded-full">Ver Detalles</span>
                    </div>
                 </div>
              ))}
            </div>
        </section>
      </main>

      {selectedEvent && currentEventId && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto animate-fade-in p-4 md:p-10">
          <div className="max-w-7xl mx-auto relative bg-stone-900/50 rounded-[3rem] border border-white/10 p-6 md:p-12 shadow-2xl">
            <button onClick={closeReservationModal} className="absolute top-8 right-8 text-stone-500 hover:text-white transition-all hover:rotate-90"><X size={40} /></button>
            
            <div className="mb-16">
              <span className="text-amber-600 font-bold uppercase tracking-[0.4em] text-[10px]">Reservando para</span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic mt-2">{selectedEvent}</h2>
              <p className="text-stone-400 text-sm mt-2">{EVENTS[currentEventId]?.date} • {EVENTS[currentEventId]?.location}</p>
            </div>
            
            {loadingOccupancy && (
              <div className="text-center py-8">
                <p className="text-amber-500 font-bold animate-pulse">Cargando disponibilidad...</p>
              </div>
            )}
            
            <div className="mb-20">
              <div className="flex items-center gap-3 text-stone-400 font-bold text-[10px] uppercase tracking-[0.4em] mb-8">
                <MapPin size={16} /> Mapa de Ubicaciones Nivel 300
              </div>
              <div className="bg-black/50 p-4 rounded-[2.5rem] border border-white/5 shadow-inner">
                <img src="/arena.jpg" alt="Mapa" className="w-full h-auto rounded-2xl shadow-2xl border border-white/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8 flex items-center gap-2"><span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span> 1. SUITE DE PREFERENCIA</h3>
                {Object.keys(suitesData).map((key) => (
                  <div key={key}>
                    <button 
                      onClick={() => { setSelectedColor(key); setSelectedNumber(""); }} 
                      className={`w-full flex justify-between items-center p-6 rounded-2xl border transition-all duration-300 ${selectedColor === key ? 'bg-amber-600 border-amber-400 translate-x-4 shadow-lg shadow-amber-600/20' : 'bg-white/5 border-white/5 text-stone-500 hover:bg-white/10'}`}
                    >
                      <div className="flex items-center gap-4">
                        {suitesData[key].icon}
                        <div className="flex flex-col text-left">
                          <span className="font-bold uppercase tracking-tight text-sm text-white">{key}</span>
                          <span className="text-[10px] text-stone-400 font-medium italic">
                            {key === "Verde Suite Gold" ? "10 ACCESOS + 2 PARKING + FAST PASS" : "20 ACCESOS + 2 PARKING + FAST PASS"}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={16} className={selectedColor === key ? 'opacity-100' : 'opacity-20'} />
                    </button>
                    <p className="text-[9px] text-stone-500 mt-2 mb-6 px-2 italic uppercase">servicio de comida disponible (no incluye comida y bebida el costo)</p>
                  </div>
                ))}
              </div>
              <div className={`lg:col-span-3 bg-black/40 p-8 md:p-12 rounded-[3rem] border border-white/5 transition-all duration-700 ${!selectedColor ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                <h3 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8">2. Disponibilidad de Suites</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {selectedColor && suitesData[selectedColor].numeros.map((num) => {
                    const isOcupada = isSuiteOccupied(num, selectedColor, currentEventId);
                    return (
                      <button 
                        key={num} 
                        disabled={isOcupada} 
                        onClick={() => setSelectedNumber(num)} 
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl font-black text-xs transition-all border 
                          ${isOcupada ? 'bg-red-900/40 border-red-500/50 text-red-500 cursor-not-allowed grayscale' : 
                            selectedNumber === num ? 'bg-white text-black border-white shadow-xl scale-110' : 'bg-stone-900/60 border-white/5 text-stone-500 hover:text-white'}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedNumber && (
              <div className="mt-16 animate-slide-up"><div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 p-[1px] rounded-[3rem] shadow-2xl"><div className="bg-[#0c0a09] rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10"><div className="text-center md:text-left"><div className="flex items-center justify-center md:justify-start gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4"><CheckCircle2 size={14}/> Suite Seleccionada</div><h4 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">#{selectedNumber}</h4><p className="text-stone-300 mt-4 italic font-bold text-lg">{suitesData[selectedColor].detalles}</p></div><div className="flex flex-col items-center md:items-end"><button onClick={handlePayment} className="bg-amber-600 hover:bg-amber-500 text-white font-black py-5 px-16 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs">Confirmar Reserva</button></div></div></div></div>
            )}

                        {/* --- SECCIÓN 3: MESAS VIP (ACTUALIZADO PARA AMBOS EVENTOS) --- */}
            <div className="mt-20 pt-10 border-t border-white/10">
              <div className="flex items-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">
                <Gem size={16} /> 3. ¿Deseas agregar una Mesa VIP?
              </div>
              <p className="text-stone-400 text-[11px] font-medium mb-8 ml-7 uppercase tracking-wider">
                * LA MESA INCLUYE <span className="text-white font-black">4 ASIENTOS</span>. NO INCLUYE BOLETO DE ENTRADA NI BEBIDAS. EL PAGO SE ABONA POR SEPARADO.
              </p>
              
              {["15-feb-2026", "20-feb-2026"].includes(currentEventId) ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-white font-bold uppercase tracking-widest text-[11px] mb-8 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></span> TIPO DE MESA
                    </h3>
                    {Object.keys(tablesGroups).map((key) => (
                      <button 
                        key={key} 
                        onClick={() => { setSelectedTableCategory(key); setSelectedTable(null); }} 
                        className={`w-full flex justify-between items-center p-6 rounded-2xl border transition-all duration-300 ${selectedTableCategory === key ? 'bg-amber-600 border-amber-400 translate-x-4 shadow-lg shadow-amber-600/20' : 'bg-white/5 border-white/5 text-stone-500 hover:bg-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          {tablesGroups[key].icon}
                          <span className="font-bold uppercase tracking-tight text-sm text-white">{key}</span>
                        </div>
                        <ArrowRight size={16} className={selectedTableCategory === key ? 'opacity-100' : 'opacity-20'} />
                      </button>
                    ))}
                  </div>

                  <div className={`lg:col-span-3 bg-black/40 p-8 rounded-[3rem] border border-white/5 transition-all duration-700 ${!selectedTableCategory ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                          <img src="/mesas15feb.jpg" alt="Mapa Mesas" className="w-full h-auto opacity-90" />
                        </div>
                        <div className="space-y-6">
                          <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Selecciona Número</label>
                          <select 
                            disabled={!selectedTableCategory}
                            onChange={(e) => {
                              const idVal = parseInt(e.target.value);
                              if(!idVal) { setSelectedTable(null); return; }
                              
                              // ✅ CRÍTICO: Usar CATEGORY_MAP para obtener la categoría interna
                              const internalCategory = CATEGORY_MAP[selectedTableCategory];
                              
                              const mesa = vipTables.find(t => t.id === idVal && t.category === internalCategory);
                              setSelectedTable(mesa);
                            }}
                            className="w-full bg-stone-900 border border-white/10 p-4 rounded-xl text-white font-bold outline-none focus:border-amber-600 transition-all cursor-pointer"
                          >
                            <option value="">Elegir mesa...</option>
                            {selectedTableCategory && tablesGroups[selectedTableCategory].numeros.map(n => {
                              // ✅ CRÍTICO: Usar CATEGORY_MAP para obtener la categoría interna
                              const internalCategory = CATEGORY_MAP[selectedTableCategory];
                              const tInfo = vipTables.find(vt => vt.id === n && vt.category === internalCategory);
                              const estaOcupada = isTableOccupied(n.toString(), selectedTableCategory);
                              
                              return (
                                <option key={`${selectedTableCategory}-${n}`} value={n} disabled={estaOcupada}>
                                  {estaOcupada ? `Mesa #${n} (OCUPADA)` : `Mesa #${n} - ${tInfo?.price} USD`}
                                </option>
                              );
                            })}
                          </select>
                          {selectedTable && (
                            <div className="p-6 bg-amber-600/10 border border-amber-600/20 rounded-2xl animate-fade-in text-left">
                              <p className="text-amber-500 text-[10px] font-black uppercase tracking-widest mb-1">Mesa #{selectedTable.id} seleccionada</p>
                              <p className="text-white text-2xl font-black">${selectedTable.price} USD</p>
                              <p className="text-stone-400 text-[10px] uppercase font-bold">Mesa para 4 Personas</p>
                            </div>
                          )}
                        </div>
                      </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-600/10 border border-amber-600/30 rounded-2xl p-8 text-center">
                  <p className="text-amber-500 font-bold uppercase tracking-widest">Selecciona un evento válido para ver las mesas</p>
                </div>
              )}

              {selectedTable && ["15-feb-2026", "20-feb-2026"].includes(currentEventId) && (
                <div className="mt-16 animate-slide-up">
                  <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-900 p-[1px] rounded-[3rem] shadow-2xl">
                    <div className="bg-[#0c0a09] rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                      <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.4em] mb-4">
                          <CheckCircle2 size={14}/> {selectedTableCategory} Seleccionada
                        </div>
                        <h4 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">#{selectedTable.id}</h4>
                        <p className="text-stone-300 mt-4 italic font-bold text-lg">${selectedTable.price} USD - Incluye 4 asientos</p>
                      </div>
                      <button onClick={handleTablePayment} className="bg-amber-600 hover:bg-amber-500 text-white font-black py-5 px-16 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs">Confirmar Reserva</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="w-full py-10 border-t border-white/5 bg-black/20 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <span className="text-amber-500 font-bold uppercase tracking-[0.3em] text-[10px] mb-1">Contacto Oficial</span>
            <a href="mailto:gomezwwarena@gmail.com" className="text-white font-medium hover:text-amber-400 transition-colors">gomezwwarena@gmail.com</a>
          </div>
          <p className="text-stone-600 text-[9px] uppercase tracking-widest">© 2026 GOMEZ ARENA - Mesquite, TX</p>
        </div>
      </footer>

      {/* BOTÓN WHATSAPP */}
      <a href="https://wa.me/14692168553" target="_blank" rel="noopener noreferrer" className="fixed bottom-8 right-8 z-[9999] bg-[#25D366] p-4 rounded-full shadow-2xl hover:scale-110 transition-transform duration-300 flex items-center justify-center group">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.938 3.659 1.432 5.631 1.433h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
      </a>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLanding />} />
        <Route path="/success" element={<Success />} />
      </Routes>
    </Router>
  );
}

export default App;