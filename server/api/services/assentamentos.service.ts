import knex from '../../common/knex';

export async function findAssentamentos() {
  const { rowCount, rows } = await knex.raw(
    `
    SELECT id from assentamentos
    `
  );

  if (rowCount === 0) return null;

  return rows;
}

export async function findLotesByAssentamentoId(id: string | number) {
  const { rows } = await knex.raw(
    `
    select 
      l.id,
      st_asgeojson(l.wkb_geometry) as shape,
      l.nome,
      l.proprietario
    from lotes l 
    where ST_INTERSECTS(
      (select a.wkb_geometry from assentamentos a where id = ${id}),
      l.wkb_geometry
    )

    `
  );

  return rows.map((row: any) => ({
    ...row,
    shape: JSON.parse(row.shape),
  }));
}

export async function findFotosByAssentamentoId(id: string | number, host: string) {
  const { rows } = await knex.raw(
    `
    select 
      f.id,
      st_asgeojson(f.wkb_geometry) as shape,
      f.nome_arquivo as path
    from fotos f 
    where ST_INTERSECTS(
      (select a.wkb_geometry from assentamentos a where id = ${id}),
      f.wkb_geometry 
    )
    `
  );

  return rows.map((row: any) => ({
    ...row,
    shape: JSON.parse(row.shape),
    path: `${host}/fotos/${row.path}`,
  }));
}

export async function findPontosByAssentamentoId(id: string | number) {
  const { rows } = await knex.raw(
    `
    select
      p.id,
      st_asgeojson(p.wkb_geometry) as shape,
      p.codigo
    from pontos p 
    where ST_INTERSECTS(
      (select a.wkb_geometry from assentamentos a where id = ${id}),
      p.wkb_geometry 
    )
    `
  );

  return rows.map((row: any) => ({
    ...row,
    shape: JSON.parse(row.shape),
  }));
}

async function getAssentamentoShapeById(id: string | number) {
  const { rowCount, rows } = await knex.raw(
    `
      select st_asgeojson(a.wkb_geometry) as shape 
      from assentamentos a where id = ${id}
    `
  );
  if (rowCount === 0) return null;

  return JSON.parse(rows[0].shape);
}

export async function getAssentamentoById(id: string | number, host: string) {
  const shape = await getAssentamentoShapeById(id);
  if (!shape) return null;
  return {
    shape: shape,
    lotes: await findLotesByAssentamentoId(id),
    pontos: await findPontosByAssentamentoId(id),
    fotos: await findFotosByAssentamentoId(id, host),
  };
}
