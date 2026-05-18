import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

const EVENTS_INFO = {
  "15-feb-2026": "PRIMER JARIPEO DEL AÑO",
  "20-feb-2026": "ALAMEÑOS DE LA SIERRA",
  "26-jun-2026": "JBF NATIONS CUP 2026"
};

const EVENTS_DATE = {
  "15-feb-2026": "Sunday, February 15",
  "20-feb-2026": "Friday, February 20",
  "26-jun-2026": "Friday, June 26, 2026"
};

const CATEGORY_NAMES = {
  "MesaVipGold":            "VIP Table",
  "MesaVipSilver":          "Silver Table",
  "Suite 10 Personas":      "Suite 10 People",
  "Suite 20 Personas":      "Suite 20 People",
  "Suite 10 People":        "Suite 10 People",
  "Suite 20 People":        "Suite 20 People",
  "Verde Suite Gold":       "Suite 10 People",
  "Amarillo Suite Premium": "Suite 20 People"
};

function Success() {
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    const type    = searchParams.get('type');
    const eventId = searchParams.get('eventId');
    const number  = searchParams.get('number');
    const cat     = searchParams.get('cat');

    if (type && eventId && number) {
      setDetails({
        type:      type === 'mesa' ? 'VIP Table' : 'Exclusive Suite',
        eventName: EVENTS_INFO[eventId] || eventId,
        date:      EVENTS_DATE[eventId] || eventId,
        number,
        category:  CATEGORY_NAMES[cat] || cat
      });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#060504] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-lg w-full bg-stone-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
        
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-amber-600/20 flex items-center justify-center animate-bounce-slow">
            <CheckCircle2 size={48} className="text-amber-500" />
          </div>
        </div>

        <h2 className="text-amber-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">Booking Confirmation</h2>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none mb-2">PAYMENT SUCCESSFUL!</h1>
        
        <p className="text-stone-400 text-sm italic mb-8">
          "Your place in the arena has been secured. Tradition and privilege await you."
        </p>

        {details ? (
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 mb-8 space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Booking</span>
              <span className="text-amber-500 font-bold uppercase">{details.type} #{details.number}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Category</span>
              <span className="text-white font-bold text-xs uppercase">{details.category}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Event</span>
              <span className="text-white font-bold text-xs uppercase text-right">{details.eventName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Date</span>
              <span className="text-white font-bold text-xs uppercase">{details.date}</span>
            </div>
          </div>
        ) : (
          <div className="bg-amber-900/10 p-4 rounded-xl border border-amber-500/20 mb-8">
            <p className="text-amber-400 text-xs">Payment processed successfully. Check your email for more details.</p>
          </div>
        )}

        <Link to="/" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black py-4 px-8 rounded-full transition-all uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
}

export default Success;