import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('public church join does not render member mobile navigation',()=>{
  const nav=read('src/components/mobile-nav.tsx')
  assert.match(nav,/pathname\.startsWith\('\/join'\)/)
  assert.match(nav,/if\([^\n]*pathname\.startsWith\('\/join'\)[^\n]*\)return null/)
})

test('repository runtime is pinned to the CI Node major',()=>{
  const pkg=JSON.parse(read('package.json'))
  const workflow=read('.github/workflows/build.yml')
  const nvm=read('.nvmrc').trim()
  assert.equal(pkg.engines.node,'22.x')
  assert.match(workflow,/node-version:\s*22/)
  assert.equal(nvm,'22')
})

test('approved master roadmap requires builder-managed source curriculum',()=>{
  const plan=read('docs/KINGDOM_NETWORK_MASTER_UPGRADE_PLAN.md')
  assert.match(plan,/general-purpose in-app Class\/Lesson Builder/i)
  assert.match(plan,/Strategy of Jesus: builder-managed content/i)
  assert.match(plan,/Disciple Your Disciplers: builder-managed content/i)
  assert.match(plan,/Marcus will personally create\/edit a class/i)
})
