import React from 'react';

const Promociones = () => {
  return (
    <section className="py-16 px-4 bg-stone-900 border-t border-white/5">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
        
        {/* Lado Izquierdo: Video de Presentación */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
          <video 
            src="/estadio-preview.mp4" 
            autoPlay 
            muted 
            loop 
            className="w-full h-full object-cover"
          />
          <p className="text-[10px] text-stone-500 mt-2 uppercase tracking-widest text-center">
            Explora nuestra Arena
          </p>
        </div>

        {/* Lado Derecho: Próximo Evento */}
        <div className="space-y-4">
          <span className="text-amber-500 font-bold uppercase tracking-tighter text-sm">Próximo Evento</span>
          <h2 className="text-3xl text-white font-black italic uppercase">15 de Febrero</h2>
          <div className="relative group">
            <img 
              src="/evento-febrero.jpg" 
              alt="Evento 15 de Febrero" 
              className="rounded-lg grayscale hover:grayscale-0 transition-all duration-500"
            />
          </div>
          <button className="w-full py-3 border border-amber-600 text-amber-500 hover:bg-amber-600 hover:text-white transition-all uppercase font-bold text-xs tracking-widest">
            Ver Detalles
          </button>
        </div>

      </div>
    </section>
  );
};

export default Promociones;