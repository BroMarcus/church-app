/** @type {import('next').NextConfig} */
const sensitiveRouteHeaders = [
  { key: 'Cache-Control', value: 'no-store, max-age=0' },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
]

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: '/auth/:path*', headers: sensitiveRouteHeaders },
      { source: '/login', headers: sensitiveRouteHeaders },
      { source: '/join/:path*', headers: sensitiveRouteHeaders },
      { source: '/account/security', headers: sensitiveRouteHeaders },
    ]
  },
}

export default nextConfig
