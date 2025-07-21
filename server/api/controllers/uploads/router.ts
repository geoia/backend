import { Router } from 'express';
import controller from './controller';
import multer from 'multer';
import os from 'os';

import authHandler from '../../middlewares/auth.handler';

const upload = multer({ dest: os.tmpdir() });

export default Router()
  .post('/shapefiles/:tipo', authHandler, upload.single('zipfile'), controller.uploadShapefiles)
  .post('/fotos', authHandler, upload.single('zipfile'), controller.uploadFotos);
