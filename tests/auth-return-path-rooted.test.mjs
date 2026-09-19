import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import test from 'node:test'

const callback=readFileSync(new URL('../src/app/auth/callback/route.ts',import.meta.url),'utf8')
const verifyPage=readFileSync(new URL('../src/app/auth/verify/page.tsx',import.meta.url),'utf8')
const verifyActions=readFileSync(new URL('../src/app/auth/verify/actions.ts',import.meta.url),'utf8')
const updatePassword=readFileSync(new URL('../src/app/auth/update-password/page.tsx',import.meta.url),'utf8')

const rootedGuard=/!\w+\.startsWith\('\/'\)\|\|\w+\.startsWith\('\/\/'\)/

test('auth callback only accepts rooted same-site return paths',()=>{
  assert.match(callback,rootedGuard)
  assert.match(callback,/requested\.origin!==canonical\.origin/)
})

test('verification UI and action both reject bare relative or protocol-relative returns',()=>{
  assert.match(verifyPage,rootedGuard)
  assert.match(verifyActions,rootedGuard)
  assert.match(verifyPage,/requested\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(verifyActions,/parsed\.pathname\.startsWith\('\/join\/'\)/)
})

test('password reset preserves only a rooted church join destination',()=>{
  assert.match(updatePassword,rootedGuard)
  assert.match(updatePassword,/parsed\.pathname\.startsWith\('\/join\/'\)/)
  assert.match(updatePassword,/const signInHref=`\/login\?lang=\$\{lang\}&mode=signin\$\{nextPart\}`/)
})
