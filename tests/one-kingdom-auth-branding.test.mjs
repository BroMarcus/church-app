import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('pilot auth entry surfaces use One Kingdom branding', async () => {
  const [login, reset] = await Promise.all([
    read('src/app/login/page.tsx'),
    read('src/app/auth/update-password/page.tsx'),
  ])

  assert.match(login, /Welcome to One Kingdom\./)
  assert.match(login, /ONE KINGDOM • PILOT/)
  assert.match(login, /Si ya has usado One Kingdom/)
  assert.doesNotMatch(login, /Welcome to Kingdom Network|KINGDOM NETWORK • PILOT|used Kingdom Network before|usado Kingdom Network/)

  assert.match(reset, /<div className="pill">ONE KINGDOM<\/div>/)
  assert.doesNotMatch(reset, /<div className="pill">KINGDOM NETWORK<\/div>/)
})
