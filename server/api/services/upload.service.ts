import { resolve, extname } from 'node:path';
import extract from 'decompress';
import os from 'os';
import fs from 'fs';
import { glob } from 'glob';
import crypto from 'node:crypto';

interface FilesUUIDS {
  [key: string]: string;
}

function remover_arquivos(tempDest: string, tempFilePath: string) {
  fs.rmSync(tempDest, { recursive: true });
  fs.rmSync(tempFilePath);
}

function checksum(file: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1').setEncoding('hex');
    fs.createReadStream(file)
      .pipe(hash)
      .on('finish', () => resolve(hash.read()))
      .on('error', reject);
  });
}

async function mover_arquivos(
  tempFilePath: string,
  tempDest: string,
  dest: string,
  rename: boolean
) {
  await extract(tempFilePath, tempDest, {
    filter: (file) =>
      ['.shx', '.shp', '.qmd', '.prj', '.dbf', '.cpg', '.jpg'].includes(extname(file.path)),
  });
  const shapefiles = glob.sync('*.shp', { cwd: resolve(tempDest) });

  const checksums = await Promise.all(
    shapefiles.map((fileName) => checksum(resolve(tempDest, fileName)))
  );

  if (rename) {
    const filesUUIDS: FilesUUIDS = checksums.reduce((acc, checksum, index) => {
      const name = shapefiles[index].split('.')[0];
      return { ...acc, [name]: checksum };
    }, {});

    const files = glob.sync('*', { cwd: resolve(tempDest) });

    files.forEach((fileName) => {
      const [name, ext] = fileName.split('.');

      // TODO - remove arquivos que não possuem .shp associado, verificar se é realmente necessário
      if (!filesUUIDS[name]) {
        fs.rmSync(resolve(tempDest, fileName));
        return;
      }

      fs.renameSync(resolve(tempDest, fileName), resolve(tempDest, filesUUIDS[name] + '.' + ext));
    });
  }

  fs.cpSync(tempDest, dest, { recursive: true });
  remover_arquivos(tempDest, tempFilePath);
}

export async function saveShapefile(tempFilePath: string, dest: string) {
  const tempDest: string = resolve(os.tmpdir(), 'extracted_' + tempFilePath.split('/').pop());
  await mover_arquivos(
    tempFilePath,
    tempDest,
    resolve(__dirname, '..', '..', '..', 'shapefiles', dest),
    true
  );
}

export async function saveImage(tempFilePath: string) {
  const tempDest: string = resolve(os.tmpdir(), 'extracted_' + tempFilePath.split('/').pop());
  await mover_arquivos(
    tempFilePath,
    tempDest,
    resolve(__dirname, '..', '..', '..', 'public', 'fotos'),
    false
  );
}

export default { saveShapefile, saveImage };
