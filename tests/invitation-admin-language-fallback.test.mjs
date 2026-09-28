import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const invitePerson=fs.readFileSync('src/app/church/invite-person/page.tsx','utf8')
const invites=fs.readFileSync('src/app/church/invites/page.tsx','utf8')
const joinCenter=fs.readFileSync('src/app/church/join-center/page.tsx','utf8')
const invitePersonError=fs.readFileSync('src/app/church/invite-person/error.tsx','utf8')
const invitesError=fs.readFileSync('src/app/church/invites/error.tsx','utf8')
const joinCenterError=fs.readFileSync('src/app/church/join-center/error.tsx','utf8')

for(const [name,source] of [['private invitation',invitePerson],['invitations list',invites],['Join Center',joinCenter]]){
  test(`${name} keeps an explicit language choice authoritative`,()=>{
    assert.match(source,/(?:params|query)\.lang===['"]es['"]\?['"]es['"]:(?:params|query)\.lang===['"]en['"]\?['"]en['"]:browserLang/)
  })

  test(`${name} falls back to the phone language when lang is missing`,()=>{
    assert.match(source,/import \{ headers \} from ['"]next\/headers['"]/)
    assert.match(source,/requestHeaders=await headers\(\)/)
    assert.match(source,/prefersSpanish\(requestHeaders\.get\(['"]accept-language['"]\)\)\?['"]es['"]:['"]en['"]/)
  })

  test(`${name} carries the resolved language into sign-in and recovery`,()=>{
    assert.match(source,/\/login\?lang=\$\{lang\}/)
    assert.match(source,/\?lang=\$\{lang\}/)
  })
}

for(const [name,source] of [['private invitation recovery',invitePersonError],['invitations recovery',invitesError],['Join Center recovery',joinCenterError]]){
  test(`${name} honors explicit language before browser fallback`,()=>{
    assert.match(source,/requested===['"]es['"]\)return['"]es['"]/)
    assert.match(source,/requested===['"]en['"]\)return['"]en['"]/)
  })

  test(`${name} falls back to document or device Spanish`,()=>{
    assert.match(source,/document\.documentElement\.lang\.toLowerCase\(\)\.startsWith\(['"]es['"]\)/)
    assert.match(source,/navigator\.language\?\.toLowerCase\(\)\.startsWith\(['"]es['"]\)\?['"]es['"]:['"]en['"]/)
  })
}
