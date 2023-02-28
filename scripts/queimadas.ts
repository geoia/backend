import knex from '../server/common/knex';
import glob from 'glob';
import { join, resolve } from 'path';
import { each } from 'bluebird';
import consola from 'consola';
import dayjs from 'dayjs';
import utcPlugin from 'dayjs/plugin/utc';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Knex } from 'knex';
import ogr2ogr from './ogr2ogr';
import { CronJob } from 'cron';
import { Option, program } from 'commander';

dayjs.extend(utcPlugin);
dayjs.extend(relativeTime);

const SHAPEFILES_DIR = resolve(__dirname, '..', 'shapefiles', 'queimadas');

type ShapefileData = {
  dirname: string;
  shapefiles: string[];
  prefix: string;
  name: string;
};

async function updateHistory({ prefix, dirname }: ShapefileData, trx?: Knex.Transaction) {
  const conn = trx || knex;

  consola.debug('Verificando existência da tabela de metadados...');
  const hasTable = await conn.schema.withSchema('public').hasTable('mapas_queimadas_historico');

  if (!hasTable) {
    await conn.schema.withSchema('public').createTable('mapas_queimadas_historico', (table) => {
      table.string('prefix').checkRegex('[0-9]{6}').primary();
      table.integer('year').unsigned();
      table.integer('month').unsigned();
      table.string('dirname');
      table.dateTime('created_at').defaultTo(conn.fn.now());
    });
  }

  return conn
    .withSchema('public')
    .insert({
      prefix,
      year: parseInt(prefix.slice(0, 4)),
      month: parseInt(prefix.slice(4, 6)),
      dirname,
    })
    .into('mapas_queimadas_historico');
}

// Função para identificar shapefiles disponíveis
function filesList(): ShapefileData[] {
  // le todos os diretorios em queimadas
  const localDirs = glob.sync('*', { cwd: SHAPEFILES_DIR });
  const regex = /^(\d{4})(\d{2})(_.*){0,1}$/i;

  const data = localDirs
    .map((dirname) => {
      // verifica se o diretório segue o padrão de nome definido
      if (!regex.test(dirname)) return;

      //verificar se existem um arquivo .shp no diretório
      const shapefiles = glob.sync('*.shp', {
        cwd: resolve(SHAPEFILES_DIR, dirname),
      });

      if (shapefiles.length === 0) return;

      // retorna dados preparados

      const [, year, month, name] = dirname.match(regex) || [];

      return { dirname, shapefiles, prefix: `${year}${month}`, name: (name || '').slice(1).trim() };
    })
    .filter((data) => data !== undefined) as ShapefileData[];

  return data.sort((a, b) => a.prefix.localeCompare(b.prefix));
}

export async function exec() {
  // obtem lista de shapefiles disponíveis
  const shapefiles = filesList().map((data) =>
    Object.assign(
      { table: `mapas_queimadas_${data.prefix}`, tmpTable: `shapefiles_queimadas_${data.prefix}` },
      data
    )
  );

  // processa shapefiles armazenados no diretório
  await each(shapefiles, async (data) => {
    consola.info(`Iniciando processamento de ${data.dirname}...`);

    consola.info('Verificando existência de dados antigos...');
    const hasTable = await knex.schema.withSchema('shapefiles').hasTable(data.tmpTable);

    if (!hasTable) {
      consola.info('Processando shapefile...');
      const opts = { table: data.tmpTable, overwrite: false };
      for (const shapefile of data.shapefiles)
        await ogr2ogr(join('queimadas', join(data.dirname, shapefile)), opts);
    }

    consola.info('Verificando existência de dados antigos em "public"...');
    const hasPublicTable = await knex.schema.withSchema('public').hasTable(data.table);

    if (!hasPublicTable) {
      consola.info('Copiando dados do mapa para shema public...');
      await knex.transaction(async (trx) => {
        await trx.schema
          .withSchema('public')
          .raw(`CREATE TABLE ${data.table} AS TABLE shapefiles."${data.tmpTable}"`);

        await trx.schema
          .withSchema('public')
          .raw(`CREATE INDEX IF NOT EXISTS geom_idx ON ${data.table} USING gist (wkb_geometry)`);

        await updateHistory(data, trx);
      });
    }

    consola.info(`Arquivo ${data.dirname} finalizado.`);
  });

  await knex.transaction(async (trx) => {
    await trx.schema.withSchema('public').dropViewIfExists('mapas_queimadas');
    await trx.schema
      .withSchema('public')
      .createView('mapas_queimadas', (view) => view.as(knex.from(shapefiles.at(-1)?.table || '')));
  });

  consola.success('Processo finalizado com sucesso!');
}

export function cronExec(cronTime: string) {
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions();
  const job = new CronJob(cronTime, exec, null, true, timeZone);

  const logNextDate = () => {
    const nextDate = job.nextDate().toJSDate();
    const dateStr = nextDate.toISOString();
    const fromNow = dayjs(nextDate).fromNow();
    consola.log(`\n=== Proxima atualização ${dateStr} (${fromNow}) ===\n`);
  };

  job.fireOnTick = () => exec().then(logNextDate);
  job.fireOnTick();

  return job;
}

if (require.main === module) {
  program
    .addOption(new Option('--cron [value]', 'The time to fire off the update in the cron syntax'))
    .action(async (opts: { cron?: string }) => {
      if (opts.cron) cronExec(opts.cron);
      else await exec().then(() => knex.destroy());
    })
    .parseAsync(process.argv);
}
