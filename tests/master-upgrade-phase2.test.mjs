import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read=(path)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8')

test('root layout resolves navigation access on the server',()=>{
  const layout=read('src/app/layout.tsx')
  assert.match(layout,/MobileNavShell/)
  assert.doesNotMatch(layout,/import \{ MobileNav \}/)
})

test('mobile navigation capabilities come from active membership and permission RPCs',()=>{
  const shell=read('src/components/mobile-nav-shell.tsx')
  assert.match(shell,/church_memberships/)
  assert.match(shell,/\.eq\('status','active'\)/)
  assert.match(shell,/current_user_has_church_permission/)
  assert.match(shell,/manage_groups/)
  assert.match(shell,/manage_teams/)
  assert.match(shell,/manage_learning/)
  assert.match(shell,/manage_outreach/)
  assert.match(shell,/manage_calendar/)
})

test('More menu is grouped and no longer exposes low-priority duplicate destinations',()=>{
  const nav=read('src/components/mobile-nav.tsx')
  assert.match(nav,/label:'Me'/)
  assert.match(nav,/label:'Church'/)
  assert.match(nav,/label:'Leadership'/)
  assert.match(nav,/label:'Settings'/)
  assert.doesNotMatch(nav,/\['\/guide\/tap'/)
  assert.doesNotMatch(nav,/\['\/fundraising'/)
  assert.doesNotMatch(nav,/\['\/network'/)
})

test('leadership navigation is capability-gated while public join stays navigation-free',()=>{
  const nav=read('src/components/mobile-nav.tsx')
  assert.match(nav,/if\(access\.canManageOutreach&&!disabled\.has\('outreach'\)\)leadership\.push/)
  assert.match(nav,/if\(access\.canManageLearning\|\|access\.canManageCalendar\)leadership\.push/)
  assert.match(nav,/leadership\.length/)
  assert.match(nav,/pathname\.startsWith\('\/join'\)/)
})
