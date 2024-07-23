import knex from '../../common/knex';

export async function estatisticas() {
  const meses = [];
  for (let i = 1; i < 13; i++) {
    meses.push({
      area_total: Math.random() * 1000,
      area_queimada: Math.random() * 100,
      num_focos: Math.floor(Math.random() * 100),
    });
  }
  return {
    estatisticas: [
      { ano: 2024, meses: meses },
      { ano: 2023, meses: meses },
      { ano: 2022, meses: meses },
      { ano: 2021, meses: meses },
    ],
  };
}

export async function municipiosComDados() {
  const query = await knex.raw(
    `select 
      distinct est.referencia_id as id, 
      dm.nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.nome 
  `
  );
  return query.rows;
}

export async function estadosComDados() {
  const query = await knex.raw(
    `select 
      distinct dm.uf_id as id, 
      dm.uf_nome as nome, 
      dm.uf_sigla as sigla  
    from estatisticas_queimadas_municipios est
    join dados_municipios dm on dm.id = est.referencia_id 
    order by dm.uf_nome  
  `
  );
  return query.rows;
}

export async function estatisticasMunicipios(municipio: string) {
  const anos = await knex.raw(
    `select 
      distinct est.ano
    from estatisticas_queimadas_municipios est
    where est.referencia_id = ${municipio}
    order by ano  
  `
  );
  const result: any = new Array<any>(anos.rows.length);

  for (let index = 0; index < anos.rows.length; index++) {
    const ano = anos.rows[index].ano;
    const query_meses = await knex.raw(
      `select 
      est.mes,
      est.total_area_queimada as area_queimada,
      est.total_focos_queimada as focos
    from estatisticas_queimadas_municipios est
    where est.referencia_id = ${municipio} and ano = ${ano}
    order by mes  
  `
    );
    result[index] = {
      ano: ano,
      meses: query_meses.rows,
    };
  }

  return result;
}

export default { estatisticas, municipiosComDados, estatisticasMunicipios };
