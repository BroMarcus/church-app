import test from 'node:test'
import assert from 'node:assert/strict'
import nextConfig from '../next.config.mjs'

const requiredHeaders = new Map([
  ['Cache-Control', 'no-store, max-age=0'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Content-Type-Options', 'nosniff'],
])

test('sensitive account-entry routes are never cached and do not leak referrers', async () => {
  assert.equal(typeof nextConfig.headers, 'function')
  const rules = await nextConfig.headers()
  const expectedSources = ['/auth/:path*', '/login', '/join/:path*']

  for (const source of expectedSources) {
    const rule = rules.find((entry) => entry.source === source)
    assert.ok(rule, `missing sensitive-route header rule for ${source}`)
    const headers = new Map(rule.headers.map(({ key, value }) => [key, value]))
    for (const [key, value] of requiredHeaders) {
      assert.equal(headers.get(key), value, `${source} must set ${key}`)
    }
  }
})

test('sensitive-route rules stay narrowly scoped instead of disabling caching globally', async () => {
  const rules = await nextConfig.headers()
  assert.equal(rules.some((entry) => entry.source === '/:path*'), false)
  assert.equal(rules.some((entry) => entry.source === '/'), false)
})
