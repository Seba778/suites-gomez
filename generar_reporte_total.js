import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Esquema flexible para leer todo sin restricciones
const anySchema = new mongoose.Schema({}, { strict: false });

// Modelos apuntando a tus colecciones reales
const Suite = mongoose.models.Suite || mongoose.model('Suite', anySchema, 'suites');
const Table = mongoose.models.Table || mongoose.model('Table', anySchema, 'tables');

const generarReporteFinal = async () => {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    // EL DATO CLAVE QUE VIMOS EN TU FOTO:
    const EVENTO_BUSCADO = "15-feb-2026"; 

    console.log(`🔎 Buscando todas las reservas con eventId: "${EVENTO_BUSCADO}"...`);

    // 1. Buscamos en SUITES que tengan ese eventId y un email asignado
    const suites = await Suite.find({ 
        eventId: EVENTO_BUSCADO,
        clientEmail: { $exists: true, $ne: null } // Que tenga dueño
    });

    // 2. Buscamos en MESAS (TABLES) que tengan ese eventId y un email asignado
    const mesas = await Table.find({ 
        eventId: EVENTO_BUSCADO,
        clientEmail: { $exists: true, $ne: null } 
    });

    // Unimos los resultados
    const todo = [...suites, ...mesas];

    console.log(`📊 RESULTADOS:`);
    console.log(`   - Suites encontradas: ${suites.length}`);
    console.log(`   - Mesas encontradas: ${mesas.length}`);
    console.log(`   - TOTAL: ${todo.length}`);

    if (todo.length === 0) {
        console.log("⚠️ No se encontraron datos. Revisa si en la base de datos el 'eventId' está escrito exactamente como '15-feb-2026'.");
    }

    // 3. Generar CSV
    let csv = "Numero,Categoria,Email Cliente,Evento ID\n";

    todo.forEach(item => {
        // Usamos los nombres exactos de tu captura de pantalla
        const num = item.numero || 'S/N';
        const cat = item.category || 'General';
        const mail = item.clientEmail || 'Sin mail';
        const evId = item.eventId || '---';

        csv += `${num},${cat},${mail},${evId}\n`;
    });

    fs.writeFileSync('Lista_FINAL_Kirk_15Feb.csv', csv);
    console.log(`✅ ¡LISTO! Archivo 'Lista_FINAL_Kirk_15Feb.csv' generado correctamente.`);

  } catch (error) {
    console.error("❌ Error grave:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

generarReporteFinal();