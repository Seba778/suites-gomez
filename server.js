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

// Esquema para Suites
const SuiteSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  estado: { type: String, default: 'bloqueada', enum: ['disponible', 'bloqueada'] },
  fechaVenta: { type: Date, default: Date.now }
});
const Suite = mongoose.model('Suite', SuiteSchema);

// Esquema para Mesas
const TableSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  categoria: { type: String, required: true },
  estado: { type: String, default: 'bloqueada', enum: ['disponible', 'bloqueada'] },
  fechaVenta: { type: Date, default: Date.now }
});
const Table = mongoose.model('Table', TableSchema);

// --- MIDDLEWARES ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- WEBHOOK DE STRIPE ---
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
    
    console.log(`🔍 WEBHOOK METADATA RECIBIDA:`, JSON.stringify(session.metadata));
    
    const isTable = session.metadata?.isTable === 'true';
    const itemNumber = session.metadata?.suite;
    
    console.log(`🔍 isTable=${isTable}, itemNumber=${itemNumber}`); 

    console.log(`🔔 Evento Stripe recibido: isTable=${isTable}, Numero=${itemNumber}`);

    if (itemNumber) {
      try {
        if (isTable) {
          console.log(`🟡 Condición isTable es TRUE - guardando en TABLES`);
          // GUARDAR MESA EN TABLES
          const result = await Table.findOneAndUpdate(
            { numero: itemNumber.toString() },
            { 
              numero: itemNumber.toString(),
              categoria: "VIP",
              estado: 'bloqueada'
            },
            { upsert: true, new: true }
          );
          console.log(`💾 ✅ MESA #${itemNumber} bloqueada en Tables (estado: ${result.estado})`);
        } else {
          console.log(`🟡 Condición isTable es FALSE - guardando en SUITES`);
          // GUARDAR SUITE EN SUITES
          const result = await Suite.findOneAndUpdate(
            { numero: itemNumber.toString() },
            { 
              numero: itemNumber.toString(),
              estado: 'bloqueada'
            },
            { upsert: true, new: true }
          );
          console.log(`💾 ✅ SUITE #${itemNumber} bloqueada en Suites (estado: ${result.estado})`);
        }

        // Envío de correo
        const customerEmail = session.customer_details?.email;
        if (customerEmail) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: '✅ Pago Confirmado - Gomez Arena VIP',
            html: `
              <div style="font-family: sans-serif; padding: 20px; background-color: #000; color: #fff; border: 1px solid #d97706; border-radius: 10px;">
                <h1 style="color: #d97706;">¡RESERVA CONFIRMADA!</h1>
                <p style="font-size: 16px;">Tu ${isTable ? 'Mesa VIP' : 'Suite'} número <strong style="font-size: 20px;">${itemNumber}</strong> ya está reservada.</p>
                <p>Lugar: <strong>1818 Rodeo Dr, Mesquite, TX</strong></p>
                <p>Presenta este correo al llegar para tu acceso exclusivo.</p>
                <hr style="border-color: #333;">
                <p style="font-size: 12px; color: #888;">Gomez Western Wear Arena - Exclusive Experience</p>
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
  }
  res.send();
});

app.use(express.json());

// --- API PARA CONSULTAR OCUPADOS ---
app.get('/api/occupied', async (req, res) => {
  try {
    // Buscar SOLO items con estado 'bloqueada'
    const [occupiedSuites, occupiedTables] = await Promise.all([
      Suite.find({ estado: 'bloqueada' }),
      Table.find({ estado: 'bloqueada' })
    ]);
    
    const suites = occupiedSuites.map(s => s.numero);
    const mesas = occupiedTables.map(t => t.numero);

    console.log(`📊 /api/occupied: ${suites.length} Suites + ${mesas.length} Mesas bloqueadas`);

    res.json({ suites, mesas });
  } catch (error) {
    console.error("🚨 Error API Ocupados:", error);
    res.status(500).json({ suites: [], mesas: [] });
  }
});

// --- CREAR SESIÓN DE PAGO ---
app.post('/create-checkout-session', async (req, res) => {
  const { suiteNumber, isTable, tableNumber, priceId } = req.body;

  try {
    let lineItem = null;
    let metadataNumber = "";

    if (isTable) {
      if (!priceId) throw new Error("Falta el Price ID de la mesa");
      console.log(`🛒 Procesando pago MESA: #${tableNumber}, priceId: ${priceId}`);
      lineItem = { price: priceId.trim(), quantity: 1 };
      metadataNumber = tableNumber.toString();
    } else {
      console.log(`🛒 Procesando pago SUITE: #${suiteNumber}`);
      let categoria = null;
      for (const color in SUITES_DATA) {
        if (SUITES_DATA[color].numeros.map(String).includes(suiteNumber.toString())) {
          categoria = SUITES_DATA[color];
          break;
        }
      }
      if (!categoria) return res.status(400).json({ error: "Suite no encontrada" });
      
      lineItem = { price: categoria.price_id.trim(), quantity: 1 };
      metadataNumber = suiteNumber.toString();
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [lineItem],
      mode: 'payment',
      allow_promotion_codes: true,
      success_url: 'https://www.gomezarenaofficial.com/success',
      cancel_url: 'https://www.gomezarenaofficial.com/',
      metadata: {
        suite: metadataNumber, 
        isTable: isTable === true ? 'true' : 'false' 
      }
    });

    console.log(`✅ Sesión Stripe creada: ${session.id}`);
    res.json({ url: session.url });
  } catch (error) {
    console.error("🚨 Error Stripe:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor Gomez Arena corriendo en puerto ${PORT}`));