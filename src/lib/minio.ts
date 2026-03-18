import * as Minio from 'minio'

const rawEndpoint = process.env.MINIO_ENDPOINT ?? 'localhost'
const endpoint = rawEndpoint.replace(/^https?:\/\//, '').replace(/\/$/, '')
const useSSL = process.env.MINIO_USE_SSL === 'true'
const port = parseInt(process.env.MINIO_PORT ?? (useSSL ? '443' : '9000'), 10)

export const minioClient = new Minio.Client({
  endPoint: endpoint,
  port,
  useSSL,
  accessKey: process.env.MINIO_ACCESS_KEY!,
  secretKey: process.env.MINIO_SECRET_KEY!,
  // pathStyle needed when endpoint is a proxy (Cloudflare) — bucket in path, not subdomain
  pathStyle: true,
})

export const MINIO_BUCKET = process.env.MINIO_BUCKET ?? 'scripty'
export const MINIO_PUBLIC_URL = (
  process.env.MINIO_PUBLIC_URL ?? `${useSSL ? 'https' : 'http'}://${endpoint}:${port}/${MINIO_BUCKET}`
).replace(/\/$/, '')

/** Returns the public HTTPS URL for a stored object key */
export function objectPublicUrl(key: string): string {
  return `${MINIO_PUBLIC_URL}/${key}`
}
