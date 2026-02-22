import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Definimos los esquemas flexibles para ambas colecciones
const suiteSchema = new mongoose.Schema({}, { strict: false });
const tableSchema = new mongoose.Schema({}, { strict: false });

// Apuntamos a tus colecciones reales en MongoDB
const Suite = mongoose.models.Suite || mongoose.model('Suite', suiteSchema, 'suites');
const Table = mongoose.models.Table || mongoose.model('Table', tableSchema, 'tables');

const generarLista = async () => {
  try {
    console.log("🔌 Conectando a MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);

    // 1. Buscamos las SUITES vendidas para el 20 de febrero
    const ventasSuites = await Suite.find({
        clientEmail: { $exists: true, $ne: null },
        eventId: '20-feb-2026'
    });

    // 2. Buscamos las MESAS vendidas para el 20 de febrero
    const ventasMesas = await Table.find({
        clientEmail: { $exists: true, $ne: null },
        eventId: '20-feb-2026'
    });

    // 3. Unimos los dos arrays en uno solo
    const todasLasVentas = [...ventasSuites, ...ventasMesas];

    console.log(`🔍 Se encontraron ${ventasSuites.length} suites y ${ventasMesas.length} mesas vendidas.`);
    console.log(`📊 Total para el 20 de febrero: ${todasLasVentas.length} lugares.`);

    // Preparamos el encabezado del CSV
    let csv = "Numero de Mesa/Suite,Categoria,Email Cliente,Fecha Venta\n";

    // Recorremos el array unificado para armar las filas
    todasLasVentas.forEach(v => {
        const numero = v.numero || 'S/N';          
        const cat = v.category || 'General';     
        const mail = v.clientEmail || 'Sin mail'; 
        const fecha = v.fechaVenta || 'N/A';      

        csv += `${numero},${cat},${mail},${fecha}\n`;
    });

    const nombreArchivo = 'Lista_FINAL_Kirk_20Feb.csv';
    fs.writeFileSync(nombreArchivo, csv);
    console.log(`✅ ¡Éxito! Archivo '${nombreArchivo}' creado con mesas y suites juntas.`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
};

generarLista();