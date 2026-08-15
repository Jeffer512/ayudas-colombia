import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.js'
import { createAviso, createOffer, createRequest } from './factories.js'

describe('borrado en cascada del usuario', () => {
  it('elimina solicitudes y ofertas del usuario a través del reporter', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'cascada@correo.org',
        passwordHash: 'hash',
        name: 'Cascada',
      },
    })

    const request = await createRequest()
    const offer = await createOffer()
    await prisma.reporter.update({
      where: { id: request.reporterId },
      data: { userId: user.id },
    })
    await prisma.reporter.update({
      where: { id: offer.reporterId },
      data: { userId: user.id },
    })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.request.findUnique({ where: { id: request.id } })).toBeNull()
    expect(await prisma.offer.findUnique({ where: { id: offer.id } })).toBeNull()
    expect(
      await prisma.reporter.count({ where: { id: request.reporterId } }),
    ).toBe(0)
    expect(await prisma.reporter.count({ where: { id: offer.reporterId } })).toBe(0)
  })

  it('deja intactos los avisos sin dueño registrado', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'cascada-aviso@correo.org',
        passwordHash: 'hash',
        name: 'Cascada',
      },
    })

    const aviso = await createAviso()
    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.aviso.findUnique({ where: { id: aviso.id } })).not.toBeNull()
  })

  it('limpia eventos y ayudas asociados a las solicitudes del usuario', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'cascada-hijos@correo.org',
        passwordHash: 'hash',
        name: 'Cascada',
      },
    })

    const request = await createRequest({
      type: 'supplies_request',
      title: 'Necesitamos agua potable en el Centro',
      description: 'Las familias del sector requieren agua para cocinar y beber.',
      events: {
        create: [
          { status: 'open', actorName: 'Sistema', note: 'Solicitud creada' },
          { status: 'resolved', actorName: 'Cruz Roja', note: 'En camino' },
        ],
      },
    })
    await prisma.requestHelper.create({
      data: { requestId: request.id, name: 'Camila', note: 'Llevo agua' },
    })
    await prisma.reporter.update({
      where: { id: request.reporterId },
      data: { userId: user.id },
    })

    await prisma.user.delete({ where: { id: user.id } })

    expect(await prisma.request.findUnique({ where: { id: request.id } })).toBeNull()
    expect(
      await prisma.requestEvent.count({ where: { requestId: request.id } }),
    ).toBe(0)
    expect(
      await prisma.requestHelper.count({ where: { requestId: request.id } }),
    ).toBe(0)
  })
})