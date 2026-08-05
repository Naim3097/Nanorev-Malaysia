// Product image uploads. The store decides where the bytes land: Supabase
// Storage (public CDN url) or, in file mode, DATA_DIR/uploads served by
// app/api/uploads/[file]/route.ts. A base64 payload keeps the admin client
// dependency-free; the 4MB decoded cap is ~5.4MB of base64 on the wire.
import { ApiError, bad, body, json, requireAdmin } from '@/server/request'
import { getStore } from '@/server/store'

const MAX_BYTES = 4 * 1024 * 1024

export async function POST(req: Request) {
  try {
    requireAdmin(req)
    const { name, dataBase64 } = await body<{ name?: string; dataBase64?: string }>(req)
    if (!name || !dataBase64) throw bad('name and dataBase64 are required')

    const ext = name.toLowerCase().match(/\.(jpe?g|png|webp)$/)?.[1]
    if (!ext) throw bad('Only .jpg, .png and .webp images are allowed')

    const buf = Buffer.from(dataBase64.replace(/^data:[^,]+,/, ''), 'base64')
    if (!buf.length || buf.length > MAX_BYTES) throw bad('Image must be between 1 byte and 4MB')

    const base = name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]/g, '-').slice(0, 50) || 'image'
    const contentType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'

    const store = await getStore()
    const url = await store.uploads.save(buf, base, ext, contentType)
    return json({ url }, 201)
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status)
    console.error(e)
    return json({ error: 'Upload failed' }, 500)
  }
}
