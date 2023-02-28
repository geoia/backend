import knex from 'knex';

const knexConnection = knex({
  client: 'pg',
  connection: {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'geoia',
    password: process.env.PG_PASSWORD || 'geoia',
    database: process.env.PG_DATABASE || 'geoia-db',
  },
  searchPath: ['public', 'shapefiles'],
});

export default knexConnection;
