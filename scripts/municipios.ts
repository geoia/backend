import knex from '../server/common/knex';
import consola from 'consola';
import axios from 'axios';
import { each, mapSeries } from 'bluebird';
import { join } from 'node:path';
import ogr2ogr from './ogr2ogr';
import { Option, program } from 'commander';

interface MunicipiosIBGE {
  'municipio-id': number;
  'municipio-nome': string;
  'microrregiao-id': number;
  'microrregiao-nome': string;
  'mesorregiao-id': number;
  'mesorregiao-nome': string;
  'regiao-imediata-id': number;
  'regiao-imediata-nome': string;
  'regiao-intermediaria-id': number;
  'regiao-intermediaria-nome': string;
  'UF-id': number;
  'UF-sigla': string;
  'UF-nome': string;
  'regiao-id': number;
  'regiao-sigla': string;
  'regiao-nome': string;
}

export async function populateDadosMunicipios(override?: boolean) {
  const hasTable = await knex.schema.withSchema('public').hasTable('dados_municipios');

  if (hasTable && !override) {
    consola.warn('Já existem dados dos municipios no banco!');
    return;
  }

  consola.info('Coletando dados da API do IBGE...');
  const { data } = await axios.get(
    'http://servicodados.ibge.gov.br/api/v1/localidades/municipios?view=nivelado'
  );

  if (!hasTable) {
    consola.info('Criando tabela para organização dos dados...');
    await knex.schema.withSchema('public').createTable('dados_municipios', (table) => {
      table.integer('id').primary();
      table.string('nome');
      table.integer('microrregiao_id');
      table.string('microrregiao_nome');
      table.integer('mesorregiao_id');
      table.string('mesorregiao_nome');
      table.integer('regiao_imediata_id');
      table.string('regiao_imediata_nome');
      table.integer('regiao_intermediaria_id');
      table.string('regiao_intermediaria_nome');
      table.integer('uf_id');
      table.string('uf_sigla');
      table.string('uf_nome');

      table.index('nome');
      table.index('uf_id');
    });
  }

  consola.info('Iterando sobre os resultados...');
  await mapSeries(data, async (mData: MunicipiosIBGE) => {
    consola.info(`Inserindo ${mData['municipio-nome']}-${mData['UF-sigla']}...`);

    await knex
      .insert({
        id: mData['municipio-id'],
        nome: mData['municipio-nome'],
        microrregiao_id: mData['microrregiao-id'],
        microrregiao_nome: mData['microrregiao-nome'],
        mesorregiao_id: mData['mesorregiao-id'],
        mesorregiao_nome: mData['mesorregiao-nome'],
        regiao_imediata_id: mData['regiao-imediata-id'],
        regiao_imediata_nome: mData['regiao-imediata-nome'],
        regiao_intermediaria_id: mData['regiao-intermediaria-id'],
        regiao_intermediaria_nome: mData['regiao-intermediaria-nome'],
        uf_id: mData['UF-id'],
        uf_sigla: mData['UF-sigla'],
        uf_nome: mData['UF-nome'],
      })
      .into('dados_municipios')
      .onConflict('id')
      .ignore();
  });

  consola.success('Dados dos municipios inseridos!');
}

async function populateMapasMunicipios(override?: boolean) {
  const [hasMunicipios, hasEstados] = await Promise.all([
    knex.schema.withSchema('shapefiles').hasTable('br_municipios_2021'),
    knex.schema.withSchema('shapefiles').hasTable('br_uf_2021'),
  ]);

  if (hasMunicipios && hasEstados && !override) {
    consola.warn('Já existem mapas dos municipios e estados no banco!');
    return;
  }

  consola.info('Carregando shapefiles do ibge no banco de dados...');
  await ogr2ogr(join('mapas', 'BR_Municipios_2021', 'BR_Municipios_2021.shp'));
  await ogr2ogr(join('mapas', 'BR_UF_2021', 'BR_UF_2021.shp'));

  await knex.transaction(async (trx) => {
    consola.info('Removendo dados antigos...');
    await trx.schema.withSchema('public').dropTableIfExists('mapas_municipios');
    await trx.schema.withSchema('public').dropTableIfExists('mapas_estados');

    consola.info('Copiando dados das tabelas...');
    await trx.schema.withSchema('public').raw(`
      CREATE TABLE public.mapas_estados AS 
      SELECT uf.cd_uf::integer AS id, uf.nm_uf AS nome, uf.sigla, uf.nm_regiao AS regiao, uf.wkb_geometry 
      FROM shapefiles.br_uf_2021 uf
    `);

    await trx.schema.withSchema('public').raw(`
      CREATE TABLE public.mapas_municipios AS 
      SELECT uf.cd_mun::integer AS id, uf.nm_mun AS nome, uf.sigla, area_km2, uf.wkb_geometry 
      FROM shapefiles.br_municipios_2021 uf
    `);

    consola.info('Criando novos indices e chaves...');
    await trx.schema
      .withSchema('public')
      .raw(`ALTER TABLE public.mapas_estados ADD PRIMARY KEY (id)`);

    await trx.schema
      .withSchema('public')
      .raw(`ALTER TABLE public.mapas_municipios ADD PRIMARY KEY (id)`);
  });

  consola.success('Mapas dos municipios inseridos!');
}

async function main(override?: boolean) {
  await each([populateDadosMunicipios, populateMapasMunicipios], (f) => f(override));
  consola.success('Processo concluído com sucesso!');
}

if (require.main === module) {
  program
    .addOption(new Option('--override', 'Override existing information on database.'))
    .action(async (opts: { override?: boolean }) => main(opts.override).then(() => knex.destroy()))
    .parseAsync(process.argv);
}
