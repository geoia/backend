import { Option, program } from 'commander';
import { createWriteStream, existsSync } from 'node:fs';
import https from 'node:https';
import { withFile } from 'tmp-promise';
import decompress from 'decompress';
import { basename, join, resolve } from 'node:path';
import consola from 'consola';
import crypto from 'crypto';

/***
 * Função auxiliar que faz o download e extrai arquivos.
 */
async function download(url: string, dest: string, override = false): Promise<void> {
  if (!override && existsSync(dest)) {
    consola.info('Files already downloaded (%s), skipping...', basename(dest));
    return;
  }

  consola.info('Downloading %s', url);
  consola.debug('Preparando arquivos temporários ...');
  return withFile(async ({ path }) => {
    consola.debug('Baixando arquivos ...');
    await new Promise<void>((resolve, reject) => {
      const fileStream = createWriteStream(path);
      https.get(
        url,
        {
          agent: new https.Agent({ secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT }),
        },
        (res) => res.pipe(fileStream)
      );
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
    });

    consola.debug('Descompactando arquivos ...');
    await decompress(path, dest);

    consola.success('Arquivos baixados e descompactados em %s com sucesso!', dest);
  });
}

if (require.main === module) {
  program
    .addOption(new Option('--override', 'Override existing files'))
    .action(async (opts: { override: boolean }) => {
      consola.info('Baixando mapas ...');
      const mapas = resolve(__dirname, '../shapefiles/mapas');
      await Promise.all([
        download(
          'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2021/Brasil/BR/BR_Municipios_2021.zip',
          join(mapas, 'BR_Municipios_2021'),
          opts.override
        ),
        download(
          'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais/municipio_2021/Brasil/BR/BR_UF_2021.zip',
          join(mapas, 'BR_UF_2021'),
          opts.override
        ),
      ]);

      consola.success('Mapas baixados com sucesso!');
    })
    .parseAsync(process.argv);
}
