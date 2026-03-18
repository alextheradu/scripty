function normalizeHostname(value) {
  if (!value) return null

  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname
  } catch {
    return null
  }
}

const minioHostname =
  normalizeHostname(process.env.MINIO_PUBLIC_URL) ??
  normalizeHostname(process.env.MINIO_ENDPOINT) ??
  'storage.example.com'

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: minioHostname },
      { protocol: 'http', hostname: minioHostname },
    ],
  },
}

module.exports = nextConfig
