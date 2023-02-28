import L from '../../common/logger';
import knex from '../../common/knex';
import { Polygon, Feature, featureCollection, combine } from '@turf/turf';
import { simplify as simplifyFn, polygon } from '@turf/turf';
import { isNil, negate } from 'lodash';
// import { union } from '../../common/utils/polygons';
import formatter from '../../common/utils/formatter';

const isNotNil = negate(isNil);

type LocaleOpts = { municipio?: number; estado?: number } & (
  | { municipio: number }
  | { estado: number }
);
type HandlerOpts = LocaleOpts;
// handler do nextjs
export async function mapas(opts: HandlerOpts) {
  const { municipio, estado } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id })
  );
  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_Transform(map.wkb_geometry, 4326), 6) AS geojson FROM ${mapa} map WHERE map.id = ${id}
    `
  );

  if (rowCount === 0) return null;

  L.debug('Dados queimadas prontos, retornando...');

  return JSON.parse(rows[0].geojson);
}

export default { mapas };
