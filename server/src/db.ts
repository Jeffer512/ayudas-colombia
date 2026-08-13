import { PrismaClient } from '@prisma/client'
import { env } from './config.js'

export const prisma = new PrismaClient({ datasourceUrl: env.databaseUrl })