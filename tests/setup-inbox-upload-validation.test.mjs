import test from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'

const read=(path)=>readFile(new URL(`../${path}`,import.meta.url),'utf8')

test('Setup Inbox uploader validates empty MIME types, categories, and safe storage names',async()=>{
  const source=await read('src/app/church/setup-inbox/setup-uploader.tsx')
  assert.match(source,/const allowedExtensions=new Set/)
  assert.match(source,/!file\.type&&!allowedExtensions\.has\(extension\)/)
  assert.match(source,/const allowedCategories=new Set/)
  assert.match(source,/allowedCategories\.has\(categoryValue\)\?categoryValue:'unsorted'/)
  assert.match(source,/slice\(-140\)\|\|'upload'/)
})
