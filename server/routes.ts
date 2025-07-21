import { Router } from 'express';
import queimadasRouter from './api/controllers/queimadas/router';
import mapasRouter from './api/controllers/mapas/router';
import scriptsRouter from './api/controllers/scripts/router';
import estatisticasRouter from './api/controllers/estatisticas/router';
import uploadsRouter from './api/controllers/uploads/router';
import assentamentosRouter from './api/controllers/assentamentos/router';

export default function routes(): Router {
  const app = Router();

  app.use('/queimadas', queimadasRouter);
  app.use('/mapas', mapasRouter);
  app.use('/scripts', scriptsRouter);
  app.use('/estatisticas', estatisticasRouter);
  app.use('/uploads', uploadsRouter);
  app.use('/assentamentos', assentamentosRouter);

  return app;
}
