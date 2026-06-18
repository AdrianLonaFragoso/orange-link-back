import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import passport from 'passport';
import './config/passport';
import { errorHandler } from './middleware/errorHandler';
import { seedPlans } from './controllers/nutrition';

import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import supplementsRoutes from './routes/supplements';
import hydrationRoutes from './routes/hydration';
import fastingRoutes from './routes/fasting';
import nutritionRoutes from './routes/nutrition';
import trainingRoutes from './routes/training';
import statusRoutes from './routes/status';
import calculatorsRoutes from './routes/calculators';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());
app.use(passport.initialize());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/supplements', supplementsRoutes);
app.use('/api/v1/hydration', hydrationRoutes);
app.use('/api/v1/fasting', fastingRoutes);
app.use('/api/v1/nutrition', nutritionRoutes);
app.use('/api/v1/training', trainingRoutes);
app.use('/api/v1/status', statusRoutes);
app.use('/api/v1/calculators', calculatorsRoutes);

app.use(errorHandler);

seedPlans()
  .then(() => console.log('Nutrition plans seeded'))
  .catch((err) => console.error('Failed to seed plans:', err))
  .finally(() => {
    app.listen(PORT, () => {
      console.log(`Orange Link Backend running on http://localhost:${PORT}`);
    });
  });
