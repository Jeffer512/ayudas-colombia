import { describe, expect, it } from 'vitest'
import { getClientIp } from '../src/lib/clientIp.js'

type MockReq = {
  header: (name: string) => string | undefined
  ip: string
  socket: { remoteAddress?: string }
}

function mockReq(
  headers: Record<string, string | undefined>,
  ip = '10.0.0.1',
): MockReq {
  return {
    header: (name: string) => headers[name.toLowerCase()],
    ip,
    socket: { remoteAddress: '10.0.0.1' },
  }
}

describe('getClientIp', () => {
  it('prefiere CF-Connecting-IP e ignora un X-Forwarded-For inyectado', () => {
    const req = mockReq({
      'cf-connecting-ip': '7.7.7.7',
      'x-forwarded-for': '6.6.6.6, 1.2.3.4, 172.71.1.1, 10.0.0.1',
    })
    expect(getClientIp(req as never)).toBe('7.7.7.7')
  })

  it('usa True-Client-IP cuando CF-Connecting-IP no está', () => {
    const req = mockReq({
      'true-client-ip': '5.5.5.5',
      'x-forwarded-for': '6.6.6.6, 1.2.3.4, 172.71.1.1, 10.0.0.1',
    })
    expect(getClientIp(req as never)).toBe('5.5.5.5')
  })

  it('cae a req.ip (XFF[-3]) ignorando valores prepuestos por el atacante', () => {
    const req = mockReq(
      { 'x-forwarded-for': '6.6.6.6, 1.2.3.4, 172.71.1.1, 10.0.0.1' },
      '1.2.3.4',
    )
    expect(getClientIp(req as never)).toBe('1.2.3.4')
  })

  it('usa req.ip en tráfico local sin cabeceras de proxy', () => {
    const req = mockReq({}, '127.0.0.1')
    expect(getClientIp(req as never)).toBe('127.0.0.1')
  })
})
