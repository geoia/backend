import { Router } from 'express';
import controller from './controller';

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .get('/municipio/:municipio', cacheMiddleware('1 week'), controller.get)
  .get('/estado/:estado', cacheMiddleware('1 week'), controller.get);
