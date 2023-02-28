import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import knex from '../server/common/knex';

type Ogr2OgrOpts = {
  table?: string;
  overwrite?: boolean;
  progress?: boolean;
};

export default async function ogr2ogr(path: string, opts?: Ogr2OgrOpts) {
  const normalizedOpts = Object.assign({ overwrite: true, progress: true }, opts || {});

  const mapasDir = resolve(__dirname, '..', 'shapefiles');
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;

  const filePath = resolve(mapasDir, path);
  const connStr = `PG:"host=${PG_HOST} port=${PG_PORT} user=${PG_USER} password=${PG_PASSWORD} dbname=${PG_DATABASE} active_schema=shapefiles"`;

  await knex.schema.createSchemaIfNotExists('shapefiles');

  let args = `-nlt POLYGON -f PostgreSQL ${connStr}`;

  if (normalizedOpts?.progress !== false) args += ' -progress';
  if (normalizedOpts?.overwrite) args += ' -preserve_fid -overwrite';
  if (normalizedOpts?.table) args += ` -nln "${normalizedOpts?.table}"`;

  const p = exec(`ogr2ogr ${args} "${filePath}"`);

  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);

  return new Promise<void>((resolve) => p.on('close', resolve));
}
