import express from 'express';
import router from './routes/productosRoutes.js';
import dotenv from 'dotenv';
import cors from 'cors';
import { CreateUser, loginCliente } from './controllers/userAccountController.js'; // ✅ Importar loginCliente
import authRouter from './routes/logingoogle.js';
import webpayRoutes from './routes/webpay.js';
import shippingRoutes from './routes/chilexpressRoutes.js';
import ordenesRouter from './routes/orderRoutes.js';
import verificarEmail from './routes/emailRoutes.js';


dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://ecommercechipelibros.pages.dev',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json());

app.use('/api/productos', router);
app.post('/api/clientes', CreateUser);
app.post('/api/login', loginCliente); 
app.use('/api/auth', authRouter);

app.use('/api/webpay', webpayRoutes);
app.use("/api/shipping", shippingRoutes);
app.use('/api/ordenes', ordenesRouter);
app.use('/api', verificarEmail);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
