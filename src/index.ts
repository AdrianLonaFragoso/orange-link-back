import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import { seedPlans } from './controllers/nutrition';

import healthRoutes from './routes/health';
import dashboardRoutes from './routes/dashboard';
import supplementsRoutes from './routes/supplements';
import hydrationRoutes from './routes/hydration';
import fastingRoutes from './routes/fasting';
import nutritionRoutes from './routes/nutrition';
import trainingRoutes from './routes/training';
import statusRoutes from './routes/status';
import calculatorsRoutes from './routes/calculators';
import userRoutes from './routes/user';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/supplements', supplementsRoutes);
app.use('/api/v1/hydration', hydrationRoutes);
app.use('/api/v1/fasting', fastingRoutes);
app.use('/api/v1/nutrition', nutritionRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/calculators', calculatorsRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/admin', adminRoutes);

app.use(errorHandler);

if (!process.env.VERCEL) {
  seedPlans()
    .then(() => console.log('Nutrition plans seeded'))
    .catch((err) => console.error('Failed to seed plans:', err))
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Orange Link Backend running on http://localhost:${PORT}`);
      });
    });
}

export default app;
