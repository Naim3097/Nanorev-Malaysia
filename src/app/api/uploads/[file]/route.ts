// Serves product images in JSON-file store mode. In Supabase mode uploads
// return a Storage CDN url and never reach this route.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { getStore } from '@/server/store'

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp',
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params
  const store = await getStore()
  if (!store.uploads.dir) return new Response('Not found', { status: 404 })

  // basename() strips any traversal — the path can only land inside uploads/
  const name = basename(file)
  const ext = name.toLowerCase().split('.').pop() ?? ''
  if (!TYPES[ext]) return new Response('Not found', { status: 404 })

  const path = resolve(store.uploads.dir, name)
  if (!existsSync(path)) return new Response('Not found', { status: 404 })

  const stream = Readable.toWeb(createReadStream(path)) as ReadableStream
  return new Response(stream, {
    headers: {
      'content-type': TYPES[ext],
      'content-length': String(statSync(path).size),
      'cache-control': 'public, max-age=2592000, immutable',
    },
  })
}
