import type { Polygon, Feature, MultiPolygon } from '@turf/turf';
import { union as unionFn } from '@turf/turf';
import { chunk } from 'lodash';

/**
 * Função auxiliar para fazer o merge dos poligonos
 * Como é demorada, foi implementada uma versão que usa de paralelismo em CPUs
 */
export function union(
  polygons: Feature<Polygon | MultiPolygon>[]
): Feature<Polygon | MultiPolygon> {
  // vai fazendo merge de pedaços e colocando aqui
  let resolved: Feature<Polygon | MultiPolygon>[] = polygons;

  do {
    // divide os poligonos em chunks de 25 polygonos
    const chunks = chunk(resolved, 25);

    // une chunk de poligonos
    resolved = chunks.map((chunk) => {
      return chunk.slice(1).reduce((memo: any, pol) => unionFn(memo, pol), chunk[0]) as Feature<
        Polygon | MultiPolygon
      >;
    });

    // faz isso até que sobre um único pedaço
  } while (resolved.length > 1);

  return resolved[0];
}
