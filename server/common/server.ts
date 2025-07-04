import express, { Application, Router } from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import http from 'http';
import os from 'os';
import cookieParser from 'cookie-parser';
import l from './logger';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';

import errorHandler from '../api/middlewares/error.handler';
import * as OpenApiValidator from 'express-openapi-validator';

const app = express();

export default class ExpressServer {
  constructor() {
    app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(compression());
    app.use(helmet.hidePoweredBy());
    app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
    app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
    app.use(
      bodyParser.urlencoded({
        extended: true,
        limit: process.env.REQUEST_LIMIT || '100kb',
      })
    );
    app.use(bodyParser.text({ limit: process.env.REQUEST_LIMIT || '100kb' }));
    app.use(cookieParser(process.env.SESSION_SECRET));

    app.use('/docs', express.static(`${path.normalize(__dirname + '/../..')}/public/api-explorer`));
    app.get('/', (_, res) => res.redirect('/docs'));

    const apiSpec = path.join(__dirname, 'api.yml');
    const validateResponses = !!(
      process.env.OPENAPI_ENABLE_RESPONSE_VALIDATION &&
      process.env.OPENAPI_ENABLE_RESPONSE_VALIDATION.toLowerCase() === 'true'
    );
    app.use('/api/spec', express.static(apiSpec));
    app.use(
      OpenApiValidator.middleware({
        apiSpec,
        validateResponses,
        // ignorePaths: /.*\/spec(\/|$)/,
        ignorePaths: (path: string) => path.endsWith('/spec') || path.endsWith('/upload'),
      })
    );
  }

  router(routes: () => Router): ExpressServer {
    app.use('/api', routes());
    app.use(errorHandler);
    return this;
  }

  listen(port: number): Application {
    if (!process.env.ADM_USER || !process.env.ADM_PASS) {
      throw 'Usuário admin não configurado.';
    }
    const welcome = (p: number) => (): void =>
      l.info(
        `up and running in ${
          process.env.NODE_ENV || 'development'
        } @: ${os.hostname()} on port: ${p}}`
      );

    http.createServer(app).listen(port, welcome(port));

    return app;
  }
}
