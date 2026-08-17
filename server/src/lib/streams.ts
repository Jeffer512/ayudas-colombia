import type { Response } from 'express'

const streams = new Map<string, Set<Response>>()

export function subscribe(city: string, res: Response) {
  let set = streams.get(city)
  if (!set) {
    set = new Set()
    streams.set(city, set)
  }
  set.add(res)
  res.on('close', () => {
    set.delete(res)
    if (set.size === 0) streams.delete(city)
  })
}

export function broadcast(city: string, event: unknown) {
  const set = streams.get(city)
  if (!set || set.size === 0) return
  const payload = `event: new\ndata: ${JSON.stringify(event)}\n\n`
  for (const res of set) {
    res.write(payload)
  }
}
