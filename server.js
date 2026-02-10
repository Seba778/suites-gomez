import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import SUITES_DATA from './configSuites.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// --- CONEXIÓN A BASE DE DATOS ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error DB:', err));

// ============================================
// 🔧 ESQUEMAS (Schemas)
// ============================================
const SuiteSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  eventId: { type: String, required: true },
  category: { type: String, required: true },
  estado: { type: String, default: 'disponible', enum: ['disponible', 'bloqueada'] },
  fechaVenta: { type: Date, default: Date.now },
  clientEmail: { type: String, default: null }
});
SuiteSchema.index({ numero: 1, eventId: 1, category: 1 }, { unique: true });
const Suite = mongoose.model('Suite', SuiteSchema);

const TableSchema = new mongoose.Schema({
  numero: { type: String, required: true },
  eventId: { type: String, required: true },
  category: { type: String, required: true },
  estado: { type: String, default: 'disponible', enum: ['disponible', 'bloqueada'] },
  fechaVenta: { type: Date, default: Date.now },
  clientEmail: { type: String, default: null }
});
TableSchema.index({ numero: 1, eventId: 1, category: 1 }, { unique: true });
const Table = mongoose.model('Table', TableSchema);

// --- MIDDLEWARES ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 🚨 IMPORTANTE: El Webhook va ANTES de express.json()
// ============================================
// 🪝 WEBHOOK DE STRIPE
// ============================================
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    const isTable = session.metadata?.isTable === 'true';
    const itemNumber = session.metadata?.suite;
    const eventId = session.metadata?.eventId;
    const category = session.metadata?.category;
    const customerEmail = session.customer_details?.email;

    if (!itemNumber || !eventId || !category) {
      console.error(`🚨 FALTA DATOS EN METADATA: número=${itemNumber}, eventId=${eventId}, category=${category}`);
      return res.send();
    }

    try {
      if (isTable) {
        console.log(`🟡 Guardando MESA #${itemNumber} - ${eventId} - ${category}`);
        await Table.findOneAndUpdate(
          { numero: itemNumber.toString(), eventId: eventId, category: category },
          { 
            numero: itemNumber.toString(),
            eventId: eventId,
            category: category,
            estado: 'bloqueada',
            clientEmail: customerEmail,
            fechaVenta: new Date()
          },
          { upsert: true, new: true }
        );
      } else {
        console.log(`🟡 Guardando SUITE #${itemNumber} - ${eventId} - ${category}`);
        await Suite.findOneAndUpdate(
          { numero: itemNumber.toString(), eventId: eventId, category: category },
          { 
            numero: itemNumber.toString(),
            eventId: eventId,
            category: category,
            estado: 'bloqueada',
            clientEmail: customerEmail,
            fechaVenta: new Date()
          },
          { upsert: true, new: true }
        );
      }

      // ENVIAR EMAIL
      if (customerEmail) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: customerEmail,
          subject: '✅ Pago Confirmado - Gomez Arena VIP',
          html: `
            <div style="font-family: sans-serif; padding: 20px; background-color: #000; color: #fff; border: 1px solid #d97706; border-radius: 10px;">
              <h1 style="color: #d97706;">¡RESERVA CONFIRMADA!</h1>
              <p style="font-size: 16px;">Tu ${isTable ? 'Mesa VIP' : 'Suite'} número <strong style="font-size: 20px;">#${itemNumber}</strong> ya está reservada.</p>
              <p><strong>Categoría:</strong> ${category}</p>
              <p><strong>Evento:</strong> ${eventId}</p>
              <p>Presenta este correo al llegar para tu acceso exclusivo.</p>
            </div>
          `
        };
        transporter.sendMail(mailOptions, (err) => {
          if (err) console.error("❌ Error enviando email:", err);
          else console.log(`📧 Email enviado a ${customerEmail}`);
        });
      }
    } catch (error) {
      console.error("🚨 Error al guardar en DB:", error);
    }
  }
  res.send();
});

// ✅ AHORA SÍ activamos el traductor JSON para el resto de rutas
app.use(express.json());

// ============================================
// ⚡ RESTO DE APIs
// ============================================
app.get('/api/occupied', async (req, res) => {
  try {
    const { eventId } = req.query;
    if (!eventId) return res.status(400).json({ error: "Falta eventId" });

    const [occupiedSuites, occupiedTables] = await Promise.all([
      Suite.find({ eventId: eventId, estado: 'bloqueada' }),
      Table.find({ eventId: eventId, estado: 'bloqueada' })
    ]);
    
    res.json({ 
      suites: occupiedSuites.map(s => ({ numero: s.numero, category: s.category })), 
      mesas: occupiedTables.map(t => ({ numero: t.numero, category: t.category })),
      eventId 
    });
  } catch (error) {
    res.status(500).json({ suites: [], mesas: [], error: error.message });
  }
});

app.post('/create-checkout-session', async (req, res) => {
  const { suiteNumber, isTable, eventId, category, tableNumber, priceId } = req.body;
  const CLIENT_URL = 'https://www.gomezarenaofficial.com';

  try {
    if (!eventId) return res.status(400).json({ error: "eventId es requerido" });

    let lineItem = null;
    let metadataNumber = "";

    if (isTable) {
      if (!priceId || !category) return res.status(400).json({ error: "Faltan datos de mesa" });

      const conflicto = await Table.findOne({
        numero: tableNumber.toString(),
        eventId: eventId,
        category: category,
        estado: 'bloqueada'
      });
      if (conflicto) return res.status(409).json({ error: `Mesa #${tableNumber} ya reservada` });

      lineItem = { price: priceId.trim(), quantity: 1 };
      metadataNumber = tableNumber.toString();
    } else {
      if (!suiteNumber) return res.status(400).json({ error: "Falta número de suite" });

      // Buscar Price ID en SUITES_DATA
      let categoriaSuite = null;
      for (const color in SUITES_DATA) {
        if (SUITES_DATA[color].numeros.map(String).includes(suiteNumber.toString())) {
          categoriaSuite = SUITES_DATA[color];
          break;
        }
      }
      if (!categoriaSuite) return res.status(400).json({ error: "Suite no encontrada" });

      const conflicto = await Suite.findOne({
        numero: suiteNumber.toString(),
        eventId: eventId,
        category: category,
        estado: 'bloqueada'
      });
      if (conflicto) return res.status(409).json({ error: `Suite #${suiteNumber} ya reservada` });

      lineItem = { price: categoriaSuite.price_id.trim(), quantity: 1 };
      metadataNumber = suiteNumber.toString();
    }

    const successUrl = `${CLIENT_URL}/success?type=${isTable ? 'mesa' : 'suite'}&eventId=${eventId}&number=${metadataNumber}&cat=${encodeURIComponent(category || '')}`;

    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: `${CLIENT_URL}/`,
      metadata: {
        suite: metadataNumber,
        isTable: isTable === true ? 'true' : 'false',
        eventId: eventId,
        category: category || ''
      }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("🚨 Error Stripe:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ==================================================================
// 🔐 ZONA ADMIN (Añadido sin tocar el resto del código)
// ==================================================================

// Endpoint para obtener estado de ocupación (para el Dashboard)
// NOTA: Usamos el mismo endpoint /api/occupied que ya tienes, 
// pero agregamos lógica para que el admin vea detalles extra si es necesario.

// Endpoint PRINCIPAL para Bloquear/Desbloquear
app.post('/api/admin/toggle', async (req, res) => {
  const { adminKey, type, numero, eventId, category } = req.body;

  // 1. Seguridad: Verificar contraseña maestra (usa process.env.ADMIN_SECRET)
  // Si no la tienes definida en .env, usa 'KirkAdmin2026' como respaldo temporal
  const SECRET = process.env.ADMIN_SECRET || 'Kirk2026';
  
  if (adminKey !== SECRET) {
    console.log(`⛔ Intento de acceso denegado con clave: ${adminKey}`);
    return res.status(401).json({ error: "Contraseña incorrecta" });
  }

  // 2. Validaciones básicas
  if (!type || !numero || !eventId || !category) {
    return res.status(400).json({ error: "Faltan datos (type, numero, eventId, category)" });
  }

  try {
    // 3. Seleccionar Modelo
    const Model = type === 'suite' ? Suite : Table;
    
    // Query exacto para encontrar el item
    const query = { 
      numero: numero.toString(), 
      eventId: eventId, 
      category: category 
    };

    // 4. Buscar si ya existe
    const item = await Model.findOne(query);

    if (item) {
      // --- CASO: YA EXISTE (Vamos a intentar DESBLOQUEAR) ---
      
      // PROTECCIÓN CRÍTICA: Si tiene un email real (de cliente) y NO es el admin
      // impedimos borrarlo accidentalmente.
      if (item.clientEmail && !item.clientEmail.includes('admin')) {
        return res.status(400).json({ 
          error: `⚠️ CUIDADO: Esta unidad fue comprada por un cliente real (${item.clientEmail}). No se puede borrar desde aquí.` 
        });
      }

      // Si es un bloqueo manual (o admin decide borrar), lo eliminamos
      await Model.findOneAndDelete(query);
      console.log(`✅ Admin liberó: ${type} ${numero} (${eventId})`);
      return res.json({ status: 'disponible', message: 'Unidad liberada correctamente' });

    } else {
      // --- CASO: NO EXISTE (Vamos a BLOQUEAR) ---
      
      await Model.create({
        ...query,
        estado: 'bloqueada',
        clientEmail: 'admin-manual-block', // Marca para saber que fue Kirk
        fechaVenta: new Date()
      });
      console.log(`🔒 Admin bloqueó: ${type} ${numero} (${eventId})`);
      return res.json({ status: 'bloqueada', message: 'Unidad bloqueada correctamente' });
    }

  } catch (error) {
    console.error("❌ Error en admin toggle:", error);
    res.status(500).json({ error: "Error del servidor" });
  }
});



const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));