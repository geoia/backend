import { Router } from 'express';
import controller from './controller';

import { middleware as cacheMiddleware } from 'apicache';

export default Router()
  .get('/', cacheMiddleware('1 week'), controller.find)
  .get('/:id', cacheMiddleware('1 week'), controller.get);
