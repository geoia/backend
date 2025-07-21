import { Request, Response } from 'express';
import { saveImage, saveShapefile } from '../../services/upload.service';

async function uploadShapefiles(req: Request, res: Response) {
  const file: Express.Multer.File | undefined = req.file;
  const dest = req.params.tipo;

  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
  }

  try {
    await saveShapefile(file.path, dest);
    return res.status(201).json({ message: 'Arquivo salvo.' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

async function uploadFotos(req: Request, res: Response) {
  const file: Express.Multer.File | undefined = req.file;
  if (!file) {
    return res.status(400).json({ message: 'Nenhum arquivo foi enviado.' });
  }

  try {
    await saveImage(file.path);
    return res.status(201).json({ message: 'Arquivo salvo.' });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
}

export default {
  uploadShapefiles,
  uploadFotos,
};
