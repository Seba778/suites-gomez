import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js'; 
import { MapPin, Crown, Star, Coffee, Car, ShieldCheck, ArrowRight, CheckCircle2, Calendar, Play, X, Users, Target, Eye, Gem } from 'lucide-react';

import { vipTables } from './mesasData';
import Success from './Success'; 
import AdminDashboard from './AdminDashboard'; 

const stripePromise = loadStripe('pk_live_51SoV9yRqCWGV92H1MaeHgtUiis4SfVjJ8Z5WEN6H2sFLoZtdnHu7LrU1qCoTuCYAApEgUivuTYVbdhwFMqHydtFq00lgEpDiQS');
const API_URL = 'https://suites-gomez-production.up.railway.app';

// ✅ MAPEO VISUAL → INTERNO
const CATEGORY_MAP = {
  "VIP TABLES": "MesaVipGold",
};

// ✅ STRIPE PRICE IDs — SUITES 26-jun-2026
const SUITE_PRICE_IDS = {
  "Suite 10 People": "price_1SpNDMRqCWGV92H13HcruvZI",  // $2,000 — 16 suites
  "Suite 20 People": "price_1SpE7RRqCWGV92H1zFtEAIV8",  // $4,000 — 1 suite
};

// ✅ EVENTOS ACTIVOS
const EVENTS = {
  "26-jun-2026": {
    name: "JBF Nations Cup 2026",
    date: "Friday, June 26, 2026",
    location: "1818 Rodeo Dr. Mesquite TX 75149",
    image: "/evento-16.jpg"
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
  
  const [occupancyData, setOccupancyData] = useState({});
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  const isSuiteOccupied = (suiteNumber, category, eventId = currentEventId) => {
    if (!eventId || !occupancyData[eventId]) return false;
    return occupancyData[eventId].suites.some(
      s => s.numero === suiteNumber.toString() && s.category === category
    );
  };

  const isTableOccupied = (tableNumber, visualCategory, eventId = currentEventId) => {
    if (!eventId || !occupancyData[eventId]) return false;
    const internalCategory = CATEGORY_MAP[visualCategory]; 
    return occupancyData[eventId].mesas.some(
      t => t.numero === tableNumber.toString() && t.category === internalCategory
    );
  };

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

  const cargarEventos = async () => {
    setLoadingOccupancy(true);
    try {
      await Promise.all([cargarOcupadosPorEvento("26-jun-2026")]);
    } finally {
      setLoadingOccupancy(false);
    }
  };

  useEffect(() => {
    if (currentEventId) {
      cargarEventos();
      const intervalo = setInterval(cargarEventos, 3000);
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

  // ✅ PAGO SUITES
  const handlePayment = async () => {
    if (!selectedNumber) return alert("Please select a suite number");
    if (!currentEventId) return alert("Please select an event");
    if (!selectedColor) return alert("Please select a suite category");

    const priceId = SUITE_PRICE_IDS[selectedColor];
    if (!priceId || priceId.startsWith("REEMPLAZAR")) {
      return alert("⚠️ Stripe Price ID not configured for this category.");
    }

    try {
      console.log(`💳 Suite #${selectedNumber} | ${selectedColor} | PriceID: ${priceId}`);
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId,
          suiteNumber: selectedNumber.toString(),
          category: selectedColor,
          eventId: currentEventId,
          isTable: false
        }),
      });
      const session = await response.json();
      if (session.error) { alert(`Error: ${session.error}`); return; }
      if (session.url) { window.location.href = session.url; }
      else { alert("Error processing payment"); }
    } catch (error) {
      console.error("Error al procesar el pago:", error);
      alert("Connection error with the server");
    }
  };

  // ✅ PAGO MESAS
  const handleTablePayment = async () => {
    if (!selectedTable) return alert("Please select a table first");
    if (!currentEventId) return alert("Please select an event");
    if (!selectedTableCategory) return alert("Please select a table category");

    try {
      const internalCategory = CATEGORY_MAP[selectedTableCategory];
      let finalPriceId = selectedTable.stripePriceId; 

      if (currentEventId === "20-feb-2026") {
        if (internalCategory === "MesaVipGold") finalPriceId = "price_1TUYkVRqCWGV92H17lBYluu6"; 
        else if (internalCategory === "MesaVipSilver") finalPriceId = "price_1T24IPRqCWGV92H1XGbRpll4"; 
      }
      if (currentEventId === "26-jun-2026") {
        if (internalCategory === "MesaVipGold") finalPriceId = "price_1TUYkVRqCWGV92H17lBYluu6"; // $600
      }

      console.log(`💳 Mesa #${selectedTable.id} | ${currentEventId} | PriceID: ${finalPriceId}`);
      const response = await fetch(`${API_URL}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: finalPriceId, 
          isTable: true,
          tableNumber: selectedTable.id.toString(),
          category: internalCategory,
          eventId: currentEventId
        }),
      });
      const session = await response.json();
      if (session.error) { alert(`Error: ${session.error}`); return; }
      if (session.url) { window.location.href = session.url; }
      else { alert("Error processing payment"); }
    } catch (error) {
      console.error("Error al procesar el pago de la mesa:", error);
      alert("Connection error with the server");
    }
  };
  
  // ── SUITES ────────────────────────────────────────────────────────
  // Suite 10 People: 16 suites · $2,000 USD
  // Suite 20 People:  1 suite  · $4,000 USD
  const suitesData = {
    "Suite 10 People": {
      color: "bg-[#7dbd7d]",
      numeros: ["320","318","316","314","312","310","308","306","304","302","301","305","307","309","360","362"],
      precioBase: 2000,
      detalles: "10 tickets included · Parking and drinks not included",
      icon: <Crown className="w-5 h-5 text-[#7dbd7d]" />
    },
    "Suite 20 People": {
      color: "bg-[#ffff00]",
      numeros: ["364"],
      precioBase: 4000,
      detalles: "20 tickets included · Parking and drinks not included",
      icon: <Star className="w-5 h-5 text-yellow-400" />
    },
  };

  // ── VIP TABLES ────────────────────────────────────────────────────
  const tablesGroups = {
    "VIP TABLES": {
      numeros: Array.from({ length: 30 }, (_, i) => i + 1),
      icon: <Gem className="w-5 h-5 text-amber-500" />
    }
  };

  return (
    <div className="min-h-screen bg-[#060504] text-white font-sans selection:bg-amber-600 overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────────────────── */}
      <div className="fixed top-0 w-full z-50">
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
        <nav className={`transition-all duration-500 ${scrolled ? 'py-3 bg-black/95 backdrop-blur-xl border-b border-amber-600/20' : 'py-7 bg-transparent'}`}>
          <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-[2px] rounded-full bg-gradient-to-br from-amber-600/60 to-amber-900/40">
                <img src="/logo.jpg" alt="Logo" className={`rounded-full transition-all duration-500 ${scrolled ? 'h-9' : 'h-11'} block`} />
              </div>
              <div className="flex flex-col">
                <span className="font-black tracking-tighter text-lg md:text-xl uppercase leading-none text-white">Gomez Western Wear</span>
                <span className="text-amber-500 font-bold text-[9px] tracking-[0.35em] uppercase mt-[2px]">Arena · Mesquite, TX</span>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-8 text-[10px] uppercase tracking-[0.2em] font-bold text-stone-400">
              <a href="#eventos" className="hover:text-amber-500 transition-colors duration-300 relative group">
                Events
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-600 group-hover:w-full transition-all duration-300" />
              </a>
              <a href="#nosotros" className="hover:text-amber-500 transition-colors duration-300 relative group">
                About Us
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-amber-600 group-hover:w-full transition-all duration-300" />
              </a>
              <a href="#eventos" className="relative overflow-hidden border border-amber-600/60 hover:border-amber-500 text-amber-400 hover:text-white px-7 py-2.5 rounded-full transition-all duration-300 group">
                <span className="absolute inset-0 bg-amber-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative">Upcoming Events</span>
              </a>
            </div>
          </div>
        </nav>
      </div>

      {/* ── HERO ────────────────────────────────────────────────── */}
      <header className="relative z-10 pt-36 md:pt-52 pb-10 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="h-[1px] w-16 bg-gradient-to-r from-transparent to-amber-600/70" />
          <p className="text-amber-500 font-bold tracking-[0.6em] uppercase text-[10px]">Elite Membership Selection</p>
          <div className="h-[1px] w-16 bg-gradient-to-l from-transparent to-amber-600/70" />
        </div>
        <h1 className="text-6xl md:text-9xl font-black leading-[0.85] uppercase tracking-tighter mb-6">
          GOMEZ <span className="text-amber-600 italic">ARENA</span>
        </h1>
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-[1px] w-12 bg-amber-800/50" />
          <div className="w-1.5 h-1.5 bg-amber-600 rotate-45" />
          <div className="h-[1px] w-24 bg-amber-700/60" />
          <div className="w-1.5 h-1.5 bg-amber-600 rotate-45" />
          <div className="h-[1px] w-12 bg-amber-800/50" />
        </div>
        <p className="text-stone-400 text-sm md:text-lg font-light italic max-w-xl mx-auto px-6 leading-relaxed">
          "Welcome to Gómez Arena — the exclusive zone where every suite is designed for a truly unforgettable experience"
        </p>
        <div className="flex items-center justify-center gap-8 mt-10">
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-stone-500 mb-1">Suites from</p>
            <p className="text-2xl font-black text-amber-500">$2,000 <span className="text-sm font-medium text-stone-400">USD</span></p>
          </div>
          <div className="w-[1px] h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-stone-500 mb-1">Tables from</p>
            <p className="text-2xl font-black text-amber-500">$600 <span className="text-sm font-medium text-stone-400">USD</span></p>
          </div>
          <div className="w-[1px] h-10 bg-white/10" />
          <div className="text-center">
            <p className="text-[9px] uppercase tracking-[0.3em] text-stone-500 mb-1">Capacity</p>
            <p className="text-2xl font-black text-white">10k+</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 space-y-32 mt-16 pb-20">

        {/* VIDEO */}
        <section className="w-full">
          <div className="flex items-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-8">
            <Play size={14} fill="currentColor"/> Arena Preview
          </div>
          <div className="relative rounded-[2.5rem] overflow-hidden border border-amber-600/20 aspect-video shadow-2xl">
            <video src="/estadio-preview.mp4" autoPlay muted loop className="w-full h-full object-cover scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-600/60 rounded-tl-lg" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-amber-600/60 rounded-tr-lg" />
            <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-amber-600/60 rounded-bl-lg" />
            <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-amber-600/60 rounded-br-lg" />
          </div>
        </section>

        {/* ── EVENTS ─────────────────────────────────────────── */}
        <section id="eventos" className="w-full text-center">
          <div className="flex items-center justify-center gap-4 mb-3">
            <div className="h-[1px] w-12 bg-amber-800/50" />
            <Calendar size={14} className="text-amber-500" />
            <span className="text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em]">Upcoming Events</span>
            <Calendar size={14} className="text-amber-500" />
            <div className="h-[1px] w-12 bg-amber-800/50" />
          </div>
          <p className="text-stone-600 text-[9px] uppercase tracking-widest mb-10">Mesquite, TX · Gomez Western Wear Arena</p>
          <div className="group relative rounded-[3rem] overflow-hidden border border-amber-600/25 shadow-2xl max-w-5xl mx-auto">
            <img src="/evento-16.jpg" alt="JBF Nations Cup 2026" className="w-full h-auto object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 flex flex-col md:flex-row items-end md:items-center justify-between gap-6">
              <div className="text-left">
                <p className="text-amber-500 text-[9px] uppercase tracking-[0.4em] font-bold mb-2">Upcoming Event</p>
                <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter leading-none text-white mb-2">JBF Nations Cup 2026</h3>
                <div className="flex items-center gap-3 text-stone-300 text-xs">
                  <Calendar size={12} className="text-amber-500" />
                  <span>Friday, June 26, 2026</span>
                  <span className="text-stone-600">·</span>
                  <MapPin size={12} className="text-amber-500" />
                  <span>Mesquite, TX</span>
                </div>
              </div>
              <button
                onClick={() => openReservationModal("26-jun-2026", "JBF Nations Cup 2026")}
                className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white font-black py-4 px-10 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs whitespace-nowrap"
              >
                Book Suite
              </button>
            </div>
            <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-600/50 rounded-tl-lg pointer-events-none" />
            <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-amber-600/50 rounded-tr-lg pointer-events-none" />
          </div>
        </section>

        {/* ── ABOUT US ────────────────────────────────────────── */}
        <section id="nosotros" className="relative rounded-[4rem] overflow-hidden border border-amber-600/10 bg-[#0a0806] p-8 md:p-20">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-600/30 to-transparent" />
          <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-600/20 to-transparent" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-left">
              <p className="text-amber-700 text-[9px] uppercase tracking-[0.5em] font-bold">Our Story</p>
              <h2 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none">
                ABOUT <span className="text-amber-600">US</span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="h-[2px] w-16 bg-amber-600" />
                <div className="w-1.5 h-1.5 bg-amber-600 rotate-45" />
              </div>
              <p className="text-stone-300 text-lg leading-relaxed italic font-light">
                Gomez Western Wear Arena was born as a one-of-a-kind space, designed to blend modern elegance with the untamed spirit of Western culture. Every corner of our arena reflects a commitment to quality and world-class hospitality.
              </p>
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5">
                <div>
                  <div className="text-amber-500 font-black text-4xl mb-1">10k+</div>
                  <div className="text-stone-500 uppercase text-[9px] tracking-widest font-bold">Total Capacity</div>
                </div>
                <div>
                  <div className="text-amber-500 font-black text-4xl mb-1">50+</div>
                  <div className="text-stone-500 uppercase text-[9px] tracking-widest font-bold">Luxury Suites</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-5">
              <div className="bg-black/40 p-8 rounded-[2rem] border border-amber-600/10 hover:border-amber-600/30 transition-all duration-500 group">
                <div className="flex items-center gap-4 mb-4 text-amber-600">
                  <Target size={24} />
                  <h4 className="text-base font-black uppercase tracking-wider italic">Our Mission</h4>
                </div>
                <p className="text-stone-400 leading-relaxed text-sm">We elevate the standard of Western entertainment, providing an unmatched hospitality experience that honors our roots while looking toward the future.</p>
              </div>
              <div className="bg-black/40 p-8 rounded-[2rem] border border-amber-600/10 hover:border-amber-600/30 transition-all duration-500">
                <div className="flex items-center gap-4 mb-4 text-amber-600">
                  <Eye size={24} />
                  <h4 className="text-base font-black uppercase tracking-wider italic">Our Vision</h4>
                </div>
                <p className="text-stone-400 leading-relaxed text-sm">To be recognized as the global epicenter of the Western lifestyle, where exclusivity and passion come together under one roof.</p>
              </div>
            </div>
          </div>
        </section>

        {/* GALLERY */}
        <section className="w-full text-center space-y-12">
          <div className="flex items-center justify-center gap-4">
            <div className="h-[1px] w-12 bg-amber-800/50" />
            <Star size={14} className="text-amber-500" fill="currentColor" />
            <span className="text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em]">Exclusive Suite Gallery</span>
            <Star size={14} className="text-amber-500" fill="currentColor" />
            <div className="h-[1px] w-12 bg-amber-800/50" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="group relative rounded-[2rem] overflow-hidden border border-amber-600/10 aspect-[4/3] bg-stone-900 shadow-xl hover:border-amber-600/30 transition-all duration-500">
                <img src={`/suite-ejemplo${num}.jpg`} alt={`Suite ${num}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white font-black text-[10px] uppercase tracking-[0.3em] border border-amber-600/50 px-5 py-2.5 rounded-full">View Details</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ── RESERVATION MODAL ────────────────────────────────────── */}
      {selectedEvent && currentEventId && (
        <div className="fixed inset-0 z-[100] bg-black/98 backdrop-blur-2xl overflow-y-auto animate-fade-in p-4 md:p-10">
          <div className="max-w-7xl mx-auto relative bg-[#080604] rounded-[3rem] border border-amber-600/15 p-6 md:p-12 shadow-2xl">
            <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-amber-600/60 to-transparent rounded-full" />
            
            <button onClick={closeReservationModal} className="absolute top-8 right-8 text-stone-600 hover:text-amber-500 transition-all hover:rotate-90 duration-300">
              <X size={36} />
            </button>
            
            <div className="mb-14">
              <span className="text-amber-600 font-bold uppercase tracking-[0.4em] text-[9px]">Booking for</span>
              <h2 className="text-4xl md:text-6xl font-black uppercase italic mt-2 leading-none">{selectedEvent}</h2>
              <p className="text-stone-500 text-sm mt-3">{EVENTS[currentEventId]?.date} · {EVENTS[currentEventId]?.location}</p>
              <div className="flex items-center gap-3 mt-5">
                <div className="h-[1px] w-12 bg-amber-800/50" />
                <div className="w-1 h-1 bg-amber-600 rotate-45" />
                <div className="h-[1px] w-12 bg-amber-800/40" />
              </div>
            </div>
            
            {loadingOccupancy && (
              <div className="text-center py-8">
                <p className="text-amber-500 font-bold animate-pulse text-[11px] uppercase tracking-widest">Loading availability...</p>
              </div>
            )}

            {/* MAP */}
            <div className="mb-20">
              <div className="flex items-center gap-3 text-stone-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-8">
                <MapPin size={14} className="text-amber-600" />
                <span>Location Map · Suite Level</span>
              </div>
              <div className="bg-black/60 p-4 rounded-[2.5rem] border border-amber-600/10 shadow-inner">
                <img src="/SUITES_21J.png" alt="Suite Map JBF Nations Cup 2026" className="w-full h-auto rounded-2xl shadow-2xl border border-white/5" />
              </div>
            </div>

            {/* SUITE SELECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-stone-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" /> 1. Preferred Suite
                </h3>
                {Object.keys(suitesData).map((key) => (
                  <div key={key}>
                    <button 
                      onClick={() => { setSelectedColor(key); setSelectedNumber(""); }} 
                      className={`w-full flex justify-between items-center p-6 rounded-2xl border transition-all duration-300 text-left
                        ${selectedColor === key 
                          ? 'bg-amber-600/10 border-amber-600/50 translate-x-2 shadow-lg shadow-amber-900/30' 
                          : 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-4">
                        {suitesData[key].icon}
                        <div className="flex flex-col">
                          <span className="font-black uppercase tracking-tight text-sm text-white">{key}</span>
                          <span className="text-amber-500 font-black text-lg mt-0.5">
                            ${suitesData[key].precioBase.toLocaleString()} <span className="text-[10px] text-stone-500 font-medium">USD</span>
                          </span>
                          <span className="text-[9px] text-stone-500 font-medium uppercase tracking-wider mt-0.5">
                            {key === "Suite 10 People"
                              ? "10 accesses · Parking and drinks not included"
                              : "20 accesses · Parking and drinks not included"}
                          </span>
                        </div>
                      </div>
                      <ArrowRight size={14} className={`transition-opacity ${selectedColor === key ? 'opacity-100 text-amber-500' : 'opacity-20'}`} />
                    </button>
                    <p className="text-[9px] text-stone-600 mt-2 mb-5 px-2 italic uppercase tracking-wide">
                      * Parking and drinks not included. Paid separately.
                    </p>
                  </div>
                ))}
              </div>

              <div className={`lg:col-span-3 bg-black/50 p-8 md:p-12 rounded-[3rem] border border-amber-600/8 transition-all duration-700 ${!selectedColor ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                <h3 className="text-stone-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8">2. Suite Availability</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {selectedColor && suitesData[selectedColor].numeros.map((num) => {
                    const isOcupada = isSuiteOccupied(num, selectedColor, currentEventId);
                    return (
                      <button 
                        key={num} 
                        disabled={isOcupada} 
                        onClick={() => setSelectedNumber(num)} 
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl font-black text-xs transition-all border 
                          ${isOcupada 
                            ? 'bg-red-900/30 border-red-800/40 text-red-600/60 cursor-not-allowed' 
                            : selectedNumber === num 
                              ? 'bg-amber-600 border-amber-500 text-white shadow-xl shadow-amber-900/40 scale-110' 
                              : 'bg-stone-900/60 border-white/5 text-stone-500 hover:text-amber-400 hover:border-amber-700/30'}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SUITE CONFIRMED */}
            {selectedNumber && (
              <div className="mt-16 animate-slide-up">
                <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 p-[1px] rounded-[3rem] shadow-2xl shadow-amber-900/30">
                  <div className="bg-[#0c0a08] rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2 text-amber-500 text-[9px] font-black uppercase tracking-[0.4em] mb-4">
                        <CheckCircle2 size={12}/> Suite Selected
                      </div>
                      <h4 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">#{selectedNumber}</h4>
                      <p className="text-stone-300 mt-3 italic text-base">{suitesData[selectedColor].detalles}</p>
                      <p className="text-amber-500 font-black text-2xl mt-2">
                        ${suitesData[selectedColor].precioBase.toLocaleString()} <span className="text-sm text-stone-400 font-medium">USD</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-center md:items-end gap-3">
                      <button onClick={handlePayment} className="relative overflow-hidden bg-amber-600 hover:bg-amber-500 text-white font-black py-5 px-14 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs">
                        Confirm Booking
                      </button>
                      <p className="text-[9px] text-stone-600 uppercase tracking-wider">Secure payment · Stripe</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── VIP TABLES ─────────────────────────────────────── */}
            <div className="mt-20 pt-10 border-t border-amber-600/10">
              <div className="flex items-center gap-3 text-amber-500 font-bold text-[10px] uppercase tracking-[0.4em] mb-2">
                <Gem size={14} /> 3. Would you like to add a VIP Table?
              </div>
              <p className="text-stone-500 text-[10px] font-medium mb-8 ml-6 uppercase tracking-wider">
                * Includes <span className="text-white font-black">4 seats</span>. Does not include entry ticket, parking, or drinks. Payment is made separately.
              </p>
              
              {["20-feb-2026", "26-jun-2026"].includes(currentEventId) ? (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-stone-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-8 flex items-center gap-2">
                      <span className="w-2 h-2 bg-amber-600 rounded-full animate-pulse" /> Table Type
                    </h3>
                    {Object.keys(tablesGroups).map((key) => (
                      <button 
                        key={key} 
                        onClick={() => { setSelectedTableCategory(key); setSelectedTable(null); }} 
                        className={`w-full flex justify-between items-center p-6 rounded-2xl border transition-all duration-300 text-left
                          ${selectedTableCategory === key 
                            ? 'bg-amber-600/10 border-amber-600/50 translate-x-2 shadow-lg shadow-amber-900/30' 
                            : 'bg-white/3 border-white/5 hover:bg-white/6 hover:border-white/10'}`}
                      >
                        <div className="flex items-center gap-4">
                          {tablesGroups[key].icon}
                          <div className="flex flex-col">
                            <span className="font-bold uppercase tracking-tight text-sm text-white">{key}</span>
                            <span className="text-[9px] text-stone-500 uppercase tracking-wider mt-0.5">4 seats · Drinks not included</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className={`transition-opacity ${selectedTableCategory === key ? 'opacity-100 text-amber-500' : 'opacity-20'}`} />
                      </button>
                    ))}
                  </div>

                  <div className={`lg:col-span-3 bg-black/50 p-8 rounded-[3rem] border border-amber-600/8 transition-all duration-700 ${!selectedTableCategory ? 'opacity-40 grayscale' : 'opacity-100'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="rounded-2xl overflow-hidden border border-amber-600/15 shadow-lg">
                        <img src="/mapa-mesas-jbf.jpg" alt="VIP Tables Map" className="w-full h-auto opacity-90" />
                      </div>
                      <div className="space-y-6">
                        <label className="text-[10px] text-stone-500 uppercase font-bold tracking-widest">Select Number</label>
                        <select 
                          disabled={!selectedTableCategory}
                          onChange={(e) => {
                            const idVal = parseInt(e.target.value);
                            if (!idVal) { setSelectedTable(null); return; }
                            const internalCategory = CATEGORY_MAP[selectedTableCategory];
                            let mesa = vipTables.find(t => t.id === idVal && t.category === internalCategory);
                            if (!mesa) {
                              mesa = { id: idVal, category: internalCategory };
                            } else {
                              mesa = { ...mesa };
                            }
                            mesa.price = 600;
                            setSelectedTable(mesa);
                          }}
                          className="w-full bg-stone-900 border border-amber-600/20 p-4 rounded-xl text-white font-bold outline-none focus:border-amber-600 transition-all cursor-pointer"
                        >
                          <option value="">Choose table...</option>
                          {selectedTableCategory && tablesGroups[selectedTableCategory].numeros.map(n => {
                            const estaOcupada = isTableOccupied(n.toString(), selectedTableCategory);
                            return (
                              <option key={`${selectedTableCategory}-${n}`} value={n} disabled={estaOcupada}>
                                {estaOcupada ? `Table #${n} (OCCUPIED)` : `Table #${n} — $600 USD`}
                              </option>
                            );
                          })}
                        </select>
                        {selectedTable && (
                          <div className="p-6 bg-amber-600/8 border border-amber-600/20 rounded-2xl animate-fade-in text-left">
                            <p className="text-amber-500 text-[9px] font-black uppercase tracking-widest mb-1">VIP Table #{selectedTable.id} selected</p>
                            <p className="text-white text-3xl font-black">${selectedTable.price} <span className="text-sm text-stone-400 font-medium">USD</span></p>
                            <p className="text-stone-500 text-[9px] uppercase font-bold tracking-wider mt-1">4 seats · Drinks not included</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-600/5 border border-amber-600/20 rounded-2xl p-8 text-center">
                  <p className="text-amber-700 font-bold uppercase tracking-widest text-[11px]">Please select a valid event to see available tables</p>
                </div>
              )}

              {selectedTable && ["20-feb-2026", "26-jun-2026"].includes(currentEventId) && (
                <div className="mt-16 animate-slide-up">
                  <div className="bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 p-[1px] rounded-[3rem] shadow-2xl shadow-amber-900/30">
                    <div className="bg-[#0c0a08] rounded-[2.9rem] p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
                      <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 text-amber-500 text-[9px] font-black uppercase tracking-[0.4em] mb-4">
                          <CheckCircle2 size={12}/> VIP Table Selected
                        </div>
                        <h4 className="text-6xl md:text-8xl font-black tracking-tighter uppercase italic text-white leading-none">#{selectedTable.id}</h4>
                        <p className="text-amber-500 font-black text-2xl mt-3">${selectedTable.price} <span className="text-sm text-stone-400 font-medium">USD</span></p>
                        <p className="text-stone-400 text-sm italic mt-1">4 seats · Drinks not included</p>
                      </div>
                      <div className="flex flex-col items-center gap-3">
                        <button onClick={handleTablePayment} className="bg-amber-600 hover:bg-amber-500 text-white font-black py-5 px-14 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs">
                          Confirm Booking
                        </button>
                        <p className="text-[9px] text-stone-600 uppercase tracking-wider">Secure payment · Stripe</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ──────────────────────────────────────────────── */}
      <footer className="w-full mt-10 border-t border-amber-600/15 bg-[#040302]">
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-amber-700/40 to-transparent" />
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <img src="/logo.jpg" alt="Logo" className="h-9 w-9 rounded-full border border-amber-600/30" />
                <div>
                  <p className="text-white font-black uppercase tracking-tight text-sm leading-none">Gomez Western Wear</p>
                  <p className="text-amber-600 text-[9px] uppercase tracking-[0.3em] font-bold mt-0.5">Arena Exclusive</p>
                </div>
              </div>
              <p className="text-stone-600 text-xs leading-relaxed italic max-w-[220px]">More than a venue. It's a destination.</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-amber-700 text-[9px] uppercase tracking-[0.4em] font-bold mb-1">Venue</p>
              <p className="text-stone-500 text-xs">Mesquite, TX</p>
              <p className="text-stone-500 text-xs">Capacity 10,000+ people</p>
              <p className="text-stone-500 text-xs">50+ Luxury Suites</p>
              <p className="text-stone-500 text-xs">VIP Tables available</p>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-amber-700 text-[9px] uppercase tracking-[0.4em] font-bold mb-1">Official Contact</p>
              <a href="mailto:gomezwwarena@gmail.com" className="text-stone-400 hover:text-amber-400 transition-colors text-xs">gomezwwarena@gmail.com</a>
              <a href="https://wa.me/14692168553" target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-amber-400 transition-colors text-xs">WhatsApp: +1 (469) 216-8553</a>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-stone-700 text-[9px] uppercase tracking-widest">© 2026 Gomez Arena — Mesquite, TX. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <div className="w-1 h-1 bg-amber-800 rotate-45" />
              <p className="text-stone-700 text-[9px] uppercase tracking-widest">Est. Mesquite, TX</p>
              <div className="w-1 h-1 bg-amber-800 rotate-45" />
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp flotante */}
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
        <Route path="/admin-kirk" element={<AdminDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;