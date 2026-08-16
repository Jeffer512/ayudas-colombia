import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { env } from '../config.js'
import { ApiError } from '../lib/errors.js'

const DATA_URL_PREFIX = /^data:image\/(jpeg|png|webp);base64,/

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseSecretKey)
}

export async function uploadPhoto(dataUrl: string): Promise<string> {
  if (!isSupabaseConfigured()) {
    return dataUrl
  }

  const match = DATA_URL_PREFIX.exec(dataUrl)
  if (!match) {
    throw new ApiError(400, 'Foto inválida')
  }

  const mime = match[1]
  const base64 = dataUrl.slice(match[0].length)
  const buffer = Buffer.from(base64, 'base64')
  const ext = mime === 'jpeg' ? 'jpg' : mime
  const storagePath = `requests/${randomUUID()}.${ext}`

  const supabase = createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false },
  })

  const { error } = await supabase.storage.from(env.supabaseBucket).upload(
    storagePath,
    buffer,
    { contentType: `image/${mime}` },
  )
  if (error) {
    throw new ApiError(500, 'No se pudo guardar la foto. Inténtalo de nuevo.')
  }

  const { data } = supabase.storage.from(env.supabaseBucket).getPublicUrl(storagePath)
  return data.publicUrl
}