import L from '../../common/logger';
import knex from '../../common/knex';
import { Polygon, Feature, featureCollection, combine } from '@turf/turf';
import { simplify as simplifyFn, polygon } from '@turf/turf';
import { isNil, negate } from 'lodash';
// import { union } from '../../common/utils/polygons';
import formatter from '../../common/utils/formatter';

const isNotNil = negate(isNil);

type BaseHandlerOpts = { detailed?: boolean; limit?: number; page?: number };
type LocaleOpts = { municipio?: number; estado?: number } & (
  | { municipio: number }
  | { estado: number }
);
type HandlerOpts = BaseHandlerOpts & LocaleOpts;

export async function count(opts: LocaleOpts) {
  const { municipio, estado } = opts;

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  L.debug('Obtendo contagem de queimadas usando "%s"...', formatter.object({ mapa, id }));
  const { rows } = await knex.raw(
    `
    SELECT COUNT(m.fid) AS count FROM mapas_queimadas m
    WHERE ST_Within(
      ST_Transform(m.wkb_geometry, 4326),
      (SELECT ST_Transform(map.wkb_geometry, 4326) FROM ${mapa} map WHERE map.id = ${id})
    )
    `
  );

  return rows.at(0).count as number;
}

function ensureValue(value: number | undefined, min: number, max?: number) {
  return Math.max(Math.min(value || min, max || Infinity), min);
}

// handler do nextjs
export async function queimadas(opts: HandlerOpts) {
  const { municipio, estado, detailed } = opts;

  let { page, limit } = opts;

  page = ensureValue(page, 1);
  limit = ensureValue(limit, 100);

  const [mapa, id] = isNotNil(estado) ? ['mapas_estados', estado] : ['mapas_municipios', municipio];

  L.debug(
    'Obtendo dados de queimadas usando "%s"...',
    formatter.object({ mapa, id, detailed, page })
  );
  const { rowCount, rows } = await knex.raw(
    `
    SELECT ST_AsGeoJSON(ST_Transform(sm.geom, 4326), 6) AS geojson
    FROM (
      SELECT m.wkb_geometry AS geom FROM mapas_queimadas m
      WHERE ST_Within(
        ST_Transform(m.wkb_geometry, 4326),
        (SELECT ST_Transform(map.wkb_geometry, 4326) FROM ${mapa} map WHERE map.id = ${id})
      )
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    ) sm;
    `
  );

  if (rowCount === 0) return null;

  L.debug('Transformando dados em poligonos...');
  const polygons: Feature<Polygon>[] = rows.map((row: { geojson: string }) =>
    polygon(JSON.parse(row.geojson).coordinates)
  );

  L.debug('Agrupando (%s) poligonos em um único geojson...', rowCount);
  let multiPolygons = combine(featureCollection(polygons));
  // let multiPolygons = featureCollection(
  //   chunk(polygons, 1000).map((polygonsChunk) => union(polygonsChunk))
  // );

  if (!detailed) {
    L.debug('Simplificando poligonos...');
    multiPolygons = simplifyFn(multiPolygons, { tolerance: 0.001, highQuality: true });
  }

  // manobra para reduzir tamanho do resultado
  multiPolygons.features[0].properties.collectedProperties = [];

  L.debug('Dados queimadas prontos, retornando...');
  return multiPolygons;
}

export default { count, queimadas };
