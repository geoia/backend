import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import knex from '../knex';

type Ogr2OgrOpts = {
  type?: string;
  table?: string;
  overwrite?: boolean;
  progress?: boolean;
};

/***
 * Função que faz chamada de sistema para processamento de arquivos shapefile
 */
export default async function ogr2ogr(path: string, opts?: Ogr2OgrOpts) {
  const normalizedOpts = Object.assign({ overwrite: true, progress: true }, opts || {});

  const mapasDir = resolve(__dirname, '../../../shapefiles');
  const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;

  const filePath = resolve(mapasDir, path);
  const connStr = `PG:"host=${PG_HOST} port=${PG_PORT} user=${PG_USER} password=${PG_PASSWORD} dbname=${PG_DATABASE} active_schema=shapefiles"`;

  await knex.schema.createSchemaIfNotExists('shapefiles');

  let args = `-lco PRECISION=NO -nlt ${opts?.type ?? 'POLYGON'} -f PostgreSQL ${connStr}`;

  if (normalizedOpts?.progress !== false) args += ' -progress';
  if (normalizedOpts?.overwrite) args += ' -preserve_fid -overwrite';
  if (normalizedOpts?.table) args += ` -nln "${normalizedOpts?.table}"`;

  const p = exec(`ogr2ogr ${args} "${filePath}"`);

  p.stdout?.pipe(process.stdout);
  p.stderr?.pipe(process.stderr);

  return new Promise<void>((resolve, reject) => {
    p.on('close', resolve);
    p.on('error', reject);
  });
}
