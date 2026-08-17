'use client'

import { useState } from 'react'
import { Paperclip } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const safe=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)

export function AssetUploader({churchId,courseId,moduleId}:{churchId:string;courseId:string;moduleId:string}){
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  async function upload(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setMessage('Choose a file first.');return}
    if(file.size>50*1024*1024){setMessage('File must be 50 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient()
    const path=`${churchId}/${courseId}/${moduleId}/${crypto.randomUUID()}/${safe(file.name)}`
    const up=await supabase.storage.from('learning-assets').upload(path,file,{contentType:file.type,upsert:false})
    if(up.error){setMessage(up.error.message);setBusy(false);return}
    const title=String(formData.get('title')||file.name).trim()
    const assetType=String(formData.get('asset_type')||'resource')
    const insert=await supabase.from('course_module_assets').insert({module_id:moduleId,title,asset_type:assetType,storage_path:path})
    if(insert.error){await supabase.storage.from('learning-assets').remove([path]);setMessage(insert.error.message);setBusy(false);return}
    setMessage('Uploaded. Refreshing…');window.location.reload()
  }
  return <form action={upload} className="asset-upload"><div className="asset-upload-grid"><label><span>Resource title</span><input name="title" placeholder="Optional display title"/></label><label><span>Resource type</span><select name="asset_type" defaultValue="lesson_pdf"><option value="lesson_pdf">Lesson PDF</option><option value="handout">Handout</option><option value="slides">Slides</option><option value="image">Image</option><option value="video">Video</option><option value="resource">Other resource</option></select></label><label><span>File</span><input type="file" name="file" required accept=".pdf,.jpg,.jpeg,.png,.webp,.mp4,.pptx,.docx"/></label><button className="ghost" disabled={busy}><Paperclip size={13}/>{busy?' Uploading…':' Attach file'}</button></div>{message&&<div className="small muted" style={{marginTop:6}}>{message}</div>}</form>
}
