import { Request, Response } from 'express';
import { findAssentamentos, getAssentamentoById } from '../../services/assentamentos.service';

async function find(_req: Request, res: Response) {
  const result = await findAssentamentos();

  return res.status(result ? 200 : 204).send(result);
}

async function get(req: Request, res: Response) {
  const id = req.params.id;
  const host = `${req.protocol}://${req.get('host')}`;
  const result = await getAssentamentoById(id, host);
  return res.status(result ? 200 : 204).send(result);
}

export default { get, find };
