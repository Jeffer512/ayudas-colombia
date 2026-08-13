import { Router } from 'express'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { listCities } from '../services/cities.js'

export const citiesRouter = Router()

citiesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.json({ cities: await listCities() })
  }),
)