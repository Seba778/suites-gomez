import 'dotenv/config';
import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import SUITES_DATA from './configSuites.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app = express();

// --- CONFIGURAR EMAIL ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// --- CONEXIÓN MONGODB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error DB:', err));

// Esquema para guardar las suites vendidas
const SuiteSchema = new mongoose.Schema({
  numero: { type: String, required: true, unique: true },
  fechaVenta: { type: Date, default: Date.now }
});
const Suite = mongoose.model('Suite', SuiteSchema);

// --- CAMBIO 1: PERMISOS CORS PARA VERCEL ---
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- WEBHOOK DE STRIPE (Debe ir antes de express.json) ---
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
    const suiteNumber = session.metadata?.suite;

    if (suiteNumber) {
      try {
        await Suite.findOneAndUpdate(
          { numero: suiteNumber.toString() },
          { numero: suiteNumber.toString() },
          { upsert: true }
        );
        console.log(`💾 ÉXITO: Suite #${suiteNumber} guardada en la base de datos.`);

        const customerEmail = session.customer_details?.email;
        
        if (customerEmail) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: customerEmail,
            subject: '✅ Pago Confirmado - Gomez Arena VIP',
            html: `
              <div style="font-family: Arial, sans-serif; background-color: #060504; color: white; padding: 30px; border-radius: 10px;">
                <h2 style="color: #d97706; text-align: center; font-size: 28px;">¡PAGO EXITOSO!</h2>
                <p style="font-size: 16px; margin-top: 20px;">Hola,</p>
                <p style="font-size: 16px; line-height: 1.6;">Tu pago ha sido confirmado exitosamente. Tu lugar en <strong>Gomez Western Wear Arena</strong> ha sido reservado.</p>
                <div style="background-color: #1f2937; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
                  <h3 style="color: #d97706; margin-top: 0;">Detalles de tu Reserva:</h3>
                  <p style="margin: 10px 0;"><strong>Suite #:</strong> ${suiteNumber}</p>
                  <p style="margin: 10px 0;"><strong>Evento:</strong> Primer Jaripeo del Año</p>
                  <p style="margin: 10px 0;"><strong>Fecha:</strong> 15 de Febrero 2026</p>
                  <p style="margin: 10px 0;"><strong>Ubicación:</strong> 1818 Rodeo Dr, Mesquite, TX</p>
                </div>
                <div style="background-color: #2d3748; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                  <p style="margin: 0; font-size: 14px; color: #9ca3af;">CÓDIGO DE ACCESO</p>
                  <p style="margin: 10px 0; font-size: 36px; color: #d97706; font-weight: bold; letter-spacing: 2px;">${suiteNumber}</p>
                </div>
                <p style="color: #6b7280; font-size: 12px; margin: 10px 0;">
                  © 2026 Gomez Western Wear Arena. Todos los derechos reservados.
                </p>
              </div>
            `
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) console.error("❌ Error al enviar email:", error);
            else console.log("✅ Email enviado exitosamente a:", customerEmail);
          });
        }
      } catch (error) {
        console.error("🚨 Error al guardar en MongoDB:", error);
      }
    }
  }
  res.send();
});

app.use(express.json());

// --- RUTAS API ---

app.get('/api/occupied', async (req, res) => {
  try {
    const occupied = await Suite.find();
    const numbers = occupied.map(s => s.numero);
    res.json(numbers);
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post('/create-checkout-session', async (req, res) => {
  const { suiteNumber } = req.body;

  try {
    let categoria = null;
    for (const color in SUITES_DATA) {
      if (SUITES_DATA[color].numeros.map(String).includes(suiteNumber.toString())) {
        categoria = SUITES_DATA[color];
        break;
      }
    }

    if (!categoria) return res.status(400).json({ error: "Suite no válida" });

    const session = await stripe.checkout.sessions.create({
      line_items: [{
        price: categoria.price_id.trim(),
        quantity: 1,
      }],
      mode: 'payment',
      allow_promotion_codes: true,
      // --- CAMBIO 2: URLS DE VERCEL (CORREGIDAS) ---
      success_url: 'https://suites-gomez.vercel.app/success',
      cancel_url: 'https://suites-gomez.vercel.app/',
      metadata: { suite: suiteNumber.toString() }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("🚨 Error Stripe:", error.message);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});