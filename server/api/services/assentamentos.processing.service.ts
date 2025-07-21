import knex from '../../common/knex';
import consola from 'consola';

import ogr2ogr from '../../common/utils/ogr2ogr';
import { normalizeSRID } from '../../common/utils/normalizeSRID';

export async function processShapefiles(override?: boolean) {
  const [hasAssentamentos, hasLotes, hasPontos, hasFotos] = await Promise.all([
    knex.schema.withSchema('shapefiles').hasTable('assentamentos'),
    knex.schema.withSchema('shapefiles').hasTable('lotes'),
    knex.schema.withSchema('shapefiles').hasTable('fotos'),
    knex.schema.withSchema('shapefiles').hasTable('pontos'),
  ]);

  if (hasAssentamentos && hasLotes && hasPontos && hasFotos && !override) {
    consola.warn('Já existem os dados dos assentamentos no banco!');
    return;
  }

  const mapas = ['assentamentos', 'lotes', 'pontos', 'fotos'];

  consola.info('Carregando shapefiles do ibge no banco de dados...');
  await Promise.all([
    ogr2ogr('assentamentos', { table: 'assentamentos', type: 'POLYGON' }),
    ogr2ogr('lotes', { table: 'lotes', type: 'POLYGON' }),
    ogr2ogr('fotos', { table: 'fotos', type: 'POINT' }),
    ogr2ogr('pontos', { table: 'pontos', type: 'POINT' }),
  ]);

  await knex.transaction(async (trx) => {
    consola.info('Removendo dados antigos...');

    await Promise.all(
      mapas.map(async (mapa) => trx.schema.withSchema('public').dropTableIfExists(mapa))
    );

    consola.info('Copiando dados das tabelas...');
    await Promise.all([
      trx.schema.withSchema('public').raw(`
        create table assentamentos as
        select
          ogc_fid as id,
          wkb_geometry::geometry
        from shapefiles.assentamentos 
      `),
      trx.schema.withSchema('public').raw(`
        create table lotes as 
        select
          ogc_fid as id,
          wkb_geometry::geometry,
          property as nome,
          owner as proprietario
        from shapefiles.lotes
      `),
      trx.schema.withSchema('public').raw(`
        create table fotos as 
        select
          ogc_fid as id,
          wkb_geometry::geometry,
          name as nome_arquivo
        from shapefiles.fotos 
      `),
      trx.schema.withSchema('public').raw(`
        create table pontos as 
        select
          ogc_fid as id,
          wkb_geometry::geometry,
          code as codigo
        from shapefiles.pontos 
      `),
    ]);

    consola.info('Normalizando referências e criando novos indices e chaves...');
    await Promise.all(
      mapas.map((mapa) => {
        Promise.all([
          normalizeSRID(`public.${mapa}`, 'wkb_geometry', { transaction: trx }),
          trx.schema.withSchema('public').raw(`ALTER TABLE public.${mapa} ADD PRIMARY KEY (id)`),
          trx.schema
            .withSchema('public')
            .raw(`CREATE INDEX IF NOT EXISTS index_${mapa} on ${mapa} USING gist (wkb_geometry)`),
        ]);
      })
    );
  });

  consola.success('Shapefiles dos assentamentos inseridos!');
}
