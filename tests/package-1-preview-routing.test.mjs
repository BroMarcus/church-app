import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')
const qaHost='kingdom-network-git-preview-packa-81e01d-tmak209-6568s-projects.vercel.app'

test('Package 1 phone QA auth never falls back to production host',async()=>{
  const actions=await read('src/app/login/actions.ts')
  const callback=await read('src/app/auth/callback/route.ts')
  for(const source of [actions,callback]){
    assert.match(source,new RegExp(qaHost.replaceAll('.','\\.')))
    assert.doesNotMatch(source,/process\.env\.NEXT_PUBLIC_SITE_URL/)
    assert.doesNotMatch(source,/https:\/\/kingdom-network\.vercel\.app/)
  }
  assert.match(actions,/emailRedirectTo:callbackUrl/)
  assert.match(callback,/NextResponse\.redirect\(new URL\(next,siteUrl\)\)/)
})

test('Package 1 phone QA is visibly marked and has one shared tester entry page',async()=>{
  const layout=await read('src/app/layout.tsx')
  const page=await read('src/app/qa/package1/page.tsx')
  assert.match(layout,/PACKAGE 1 PHONE QA/)
  assert.match(layout,/NOT PRODUCTION/)
  assert.match(page,/Friendship Group Leader Test/)
  assert.match(page,/Tester accounts/)
  assert.match(page,/p1\.fgleader\.marcus\.kelting@kingdomnetwork\.test/)
  assert.match(page,/\/login\?mode=signup&lang=en/)
  assert.match(page,/\/login\?mode=signup&lang=es/)
})
