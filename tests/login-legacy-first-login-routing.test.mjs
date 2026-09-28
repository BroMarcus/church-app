import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const source = await readFile(new URL('../src/app/login/actions.ts', import.meta.url), 'utf8')

test('legacy accounts with no onboarding flag and no activity go to Start Here even when profile is missing', () => {
  assert.match(source, /const hasActivity=.*group_memberships|const hasActivity=/)
  assert.match(source, /if\(!hasActivity\)redirect\(`\/start\?welcome=1/)
  assert.doesNotMatch(source, /if\(hasBasicProfile&&!hasActivity\)/)
})

test('legacy onboarding inference stays fail-closed on read errors', () => {
  assert.match(source, /const inferenceError=profileResult\.error\|\|groupsResult\.error\|\|enrollmentsResult\.error/)
  assert.match(source, /if\(inferenceError\)\{/)
  assert.match(source, /else\{\s*const profile=profileResult\.data\s*const hasActivity=/s)
})
