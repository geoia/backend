import { Application } from 'express';
import queimadasRouter from './api/controllers/queimadas/router';
import mapasRouter from './api/controllers/mapas/router';

export default function routes(app: Application): void {
  app.use('/api/v1/queimadas', queimadasRouter);
  app.use('/api/v1/mapas', mapasRouter);
}