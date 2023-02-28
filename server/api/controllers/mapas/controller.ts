import { Request, Response } from 'express';
import { mapas } from '../../services/mapas.service';

async function get(req: Request, res: Response) {
  const criteria = req.params.municipio
    ? { municipio: parseInt(req.params.municipio) }
    : { estado: parseInt(req.params.estado) };

  const result = await mapas(criteria);

  return res.status(result ? 200 : 204).send(result);
}

export default { get };
