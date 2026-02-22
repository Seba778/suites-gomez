import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const diagnostico = async () => {
  try {
    console.log("🔌 Conectando...");
    await mongoose.connect(process.env.MONGO_URI);
    
    // 1. Ver a qué base de datos nos conectamos
    console.log(`📂 Base de Datos actual: "${mongoose.connection.name}"`);

    // 2. Listar TODAS las colecciones (tablas) que existen ahí
    const collections = await mongoose.connection.db.listCollections().toArray();
    const nombresColecciones = collections.map(c => c.name);
    console.log("📚 Colecciones encontradas:", nombresColecciones);

    if (nombresColecciones.length === 0) {
      console.log("⚠️ ¡Alerta! No se encontraron colecciones. Puede que la URL en .env no apunte a la base de datos correcta.");
    } else {
      // 3. Contar cuántos documentos hay en cada una para ver dónde están las ventas
      for (const nombre of nombresColecciones) {
        // Creamos un modelo temporal para cada colección
        const ModeloTemporal = mongoose.model(nombre, new mongoose.Schema({}, { strict: false }), nombre);
        const cantidad = await ModeloTemporal.countDocuments();
        console.log(`   - En '${nombre}' hay ${cantidad} documentos.`);
        
        // Si hay datos, mostramos el primero para ver cómo se llaman los campos
        if (cantidad > 0) {
            const ejemplo = await ModeloTemporal.findOne().lean();
            console.log(`     🔍 Ejemplo de datos en '${nombre}':`, Object.keys(ejemplo));
        }
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
};

diagnostico();