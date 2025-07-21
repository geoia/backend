import { Router } from 'express';
import controller from './controller';
import multer from 'multer';
import os from 'os';

import authHandler from '../../middlewares/auth.handler';

const upload = multer({ dest: os.tmpdir() });

export default Router()
  .post('/download-mapas', authHandler, controller.downloadMapasController)
  .post('/populate-municipios', authHandler, controller.populateMunicipiosController)
  .post('/queimadas', authHandler, controller.queimadasExecController)
  .post('/assentamentos', authHandler, controller.assentamentosExecController)
  .delete('/queimadas', authHandler, controller.queimadasDeleteController)
  .post('/queimadas/upload', authHandler, upload.single('zipfile'), controller.upload)
  .post('/estatisticas', authHandler, controller.processEstatisticasController);
