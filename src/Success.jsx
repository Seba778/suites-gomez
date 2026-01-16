import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowLeft, Crown, Calendar, MapPin } from 'lucide-react';

const Success = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ✅ RECARGAR LOS DATOS OCUPADOS DESDE TU SERVIDOR LOCAL
    const recargarOcupados = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/occupied');
        const data = await response.json();
        console.log("✅ Datos de ocupación sincronizados:", data);
        
        // Redirigir al inicio después de 5 segundos
        setTimeout(() => {
          navigate('/');
        }, 5000);
      } catch (error) {
        console.error("❌ Error al recargar ocupados:", error);
        // Aunque falle, redirige después de 3 segundos
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    };

    recargarOcupados();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#060504] text-white font-sans flex items-center justify-center p-6 overflow-hidden relative">
      
      {/* Elementos decorativos */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-900/10 blur-[120px] rounded-full"></div>

      <div className="max-w-2xl w-full relative">
        <div className="bg-stone-900/50 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-16 shadow-2xl text-center animate-fade-in">
          
          {/* Icono de Éxito */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-600 blur-2xl opacity-20 animate-pulse"></div>
              <CheckCircle2 size={80} className="text-amber-600 relative z-10" strokeWidth={1.5} />
            </div>
          </div>

          <h2 className="text-amber-500 font-bold tracking-[0.6em] uppercase text-[10px] md:text-xs mb-6 flex items-center justify-center gap-4">
            <div className="h-[1px] w-8 bg-amber-600"></div>
            Confirmación de Reserva
            <div className="h-[1px] w-8 bg-amber-600"></div>
          </h2>

          <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter leading-none mb-8">
            ¡PAGO <span className="text-amber-600">EXITOSO!</span>
          </h1>

          <div className="space-y-6 mb-12">
            <p className="text-stone-400 text-lg font-light leading-relaxed italic">
              "Tu lugar en la arena ha sido asegurado. La tradición y el privilegio te esperan."
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-2 text-stone-300 text-xs uppercase tracking-widest font-bold">
                <Crown size={16} className="text-amber-600" /> Suite Reservada
              </div>
              <div className="flex items-center gap-2 text-stone-300 text-xs uppercase tracking-widest font-bold">
                <Calendar size={16} className="text-amber-600" /> 15 de Febrero
              </div>
              <div className="flex items-center gap-2 text-stone-300 text-xs uppercase tracking-widest font-bold">
                <MapPin size={16} className="text-amber-600" /> Nivel 300
              </div>
            </div>
          </div>

          <p className="text-stone-500 text-sm mb-12">
            Recibirás un correo electrónico con los detalles de tu membresía y las instrucciones de acceso a la arena en los próximos minutos.
          </p>

          <Link 
            to="/" 
            className="inline-flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-white font-black py-5 px-12 rounded-full transition-all shadow-xl uppercase tracking-widest text-xs group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-2 transition-transform" />
            Volver al Inicio
          </Link>
        </div>

        <div className="mt-12 text-center">
            <img src="/logo.jpg" alt="Logo" className="h-10 mx-auto grayscale opacity-20" />
            <p className="text-[10px] uppercase tracking-[0.5em] text-stone-700 mt-4">Gomez Western Wear Arena © 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Success;