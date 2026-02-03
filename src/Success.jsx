import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Calendar, MapPin } from 'lucide-react';

const EVENTS_INFO = {
  "15-feb-2026": "PRIMER JARIPEO DEL AÑO",
  "20-feb-2026": "ALAMEÑOS DE LA SIERRA"
};

// Diccionario para traducir códigos internos a nombres bonitos
const CATEGORY_NAMES = {
  "MesaVipGold": "Mesa Gold",
  "MesaVipSilver": "Mesa Silver",
  "Verde Suite Gold": "Verde Suite Gold",
  "Amarillo Suite Premium": "Amarillo Suite Premium"
};

function Success() {
  const [searchParams] = useSearchParams();
  const [details, setDetails] = useState(null);

  useEffect(() => {
    // Leemos los datos de la URL que nos mandó el servidor
    const type = searchParams.get('type'); // 'mesa' o 'suite'
    const eventId = searchParams.get('eventId');
    const number = searchParams.get('number');
    const cat = searchParams.get('cat');

    if (type && eventId && number) {
      setDetails({
        type: type === 'mesa' ? 'Mesa VIP' : 'Suite Exclusiva',
        eventName: EVENTS_INFO[eventId] || eventId,
        date: eventId === '15-feb-2026' ? 'Domingo 15 de Febrero' : 'Viernes 20 de Febrero',
        number: number,
        category: CATEGORY_NAMES[cat] || cat // Traduce o usa el valor original si no encuentra traducción
      });
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#060504] flex items-center justify-center p-6 text-white font-sans">
      <div className="max-w-lg w-full bg-stone-900 border border-white/10 rounded-[2.5rem] p-10 text-center shadow-2xl relative overflow-hidden">
        
        {/* Círculo de éxito */}
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 rounded-full bg-amber-600/20 flex items-center justify-center animate-bounce-slow">
            <CheckCircle2 size={48} className="text-amber-500" />
          </div>
        </div>

        <h2 className="text-amber-500 font-bold uppercase tracking-[0.3em] text-xs mb-4">Confirmación de Reserva</h2>
        <h1 className="text-4xl md:text-5xl font-black italic uppercase leading-none mb-2">¡PAGO EXITOSO!</h1>
        
        <p className="text-stone-400 text-sm italic mb-8">
          "Tu lugar en la arena ha sido asegurado. La tradición y el privilegio te esperan."
        </p>

        {details ? (
          <div className="bg-black/40 p-6 rounded-2xl border border-white/5 mb-8 space-y-3">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Reserva</span>
              <span className="text-amber-500 font-bold uppercase">{details.type} #{details.number}</span>
            </div>
             <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Categoría</span>
              <span className="text-white font-bold text-xs uppercase">{details.category}</span>
            </div>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Evento</span>
              <span className="text-white font-bold text-xs uppercase text-right">{details.eventName}</span>
            </div>
             <div className="flex justify-between items-center">
              <span className="text-stone-500 text-xs uppercase font-bold tracking-widest">Fecha</span>
              <span className="text-white font-bold text-xs uppercase">{details.date}</span>
            </div>
          </div>
        ) : (
           <div className="bg-amber-900/10 p-4 rounded-xl border border-amber-500/20 mb-8">
             <p className="text-amber-400 text-xs">Pago procesado correctamente. Revisa tu correo para más detalles.</p>
           </div>
        )}

        <Link to="/" className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black py-4 px-8 rounded-full transition-all uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Volver al Inicio
        </Link>
      </div>
    </div>
  );
}

export default Success;