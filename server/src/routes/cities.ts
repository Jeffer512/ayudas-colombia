import { Router } from 'express'

import { listCities } from '../services/cities.js'

export const citiesRouter = Router()

citiesRouter.get(
  '/',
  async (_req, res) => {
    res.json({ cities: await listCities() })
  },
)