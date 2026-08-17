'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const safe=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)
const split=(v:FormDataEntryValue|null)=>String(v??'').split(',').map(x=>x.trim()).filter(Boolean)

export function ResourceUploader({churchId,userId}:{churchId:string;userId:string}){
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function submit(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setMessage('Choose a file first.');return}
    if(file.size>50*1024*1024){setMessage('File must be 50 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient()
    const path=`${churchId}/${crypto.randomUUID()}/${safe(file.name)}`
    const up=await supabase.storage.from('resource-library').upload(path,file,{contentType:file.type,upsert:false})
    if(up.error){setMessage(up.error.message);setBusy(false);return}
    const yearRaw=String(formData.get('source_year')??'').trim()
    const insert=await supabase.from('media_assets').insert({
      church_id:churchId,uploaded_by:userId,title:String(formData.get('title')||file.name).trim(),asset_type:file.type||'application/octet-stream',storage_path:path,
      description:String(formData.get('description')||'').trim()||null,resource_type:String(formData.get('resource_type')||'lesson'),language_code:String(formData.get('language_code')||'en'),
      source_year:yearRaw?Number(yearRaw):null,ministry_area:String(formData.get('ministry_area')||'').trim()||null,topic_tags:split(formData.get('topic_tags')),scripture_refs:split(formData.get('scripture_refs')),
      archive_status:String(formData.get('archive_status')||'legacy'),source_label:String(formData.get('source_label')||'').trim()||null,approved_for_members:formData.get('approved_for_members')==='on',can_edit_copy:true
    })
    if(insert.error){await supabase.storage.from('resource-library').remove([path]);setMessage(insert.error.message);setBusy(false);return}
    setMessage('Resource saved. Refreshing…');window.location.reload()
  }

  return <form action={submit} className="card resource-upload"><div className="resource-upload-head"><div><div className="pill">ADD RESOURCE</div><h2>Archive a lesson or ministry resource</h2></div><Upload/></div><div className="resource-form-grid"><label><span>Title</span><input name="title" required placeholder="Lesson or resource title"/></label><label><span>Resource type</span><select name="resource_type" defaultValue="lesson"><option value="lesson">Lesson</option><option value="bible_study">Bible study</option><option value="teacher_guide">Teacher guide</option><option value="handout">Handout</option><option value="sermon">Sermon</option><option value="slides">Slides</option><option value="training">Training</option><option value="video">Video</option><option value="audio">Audio</option><option value="other">Other</option></select></label><label><span>Status</span><select name="archive_status" defaultValue="legacy"><option value="current">Current / approved</option><option value="legacy">Legacy / older material</option><option value="draft">Draft</option><option value="reference_only">Reference only</option><option value="retired">Retired</option></select></label><label><span>Language</span><select name="language_code" defaultValue="en"><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>Source year</span><input name="source_year" type="number" min="1900" max="2100" placeholder="e.g. 2022"/></label><label><span>Ministry / class</span><input name="ministry_area" placeholder="First Steps, Friendship Group…"/></label><label><span>Source label</span><input name="source_label" placeholder="2021 class binder, Pastor notes…"/></label><label><span>File</span><input name="file" type="file" required accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp,.mp4,.mp3"/></label><label className="wide"><span>Topics / tags</span><input name="topic_tags" placeholder="prayer, baptism, holiness, outreach"/><small>Comma separated</small></label><label className="wide"><span>Scripture references</span><input name="scripture_refs" placeholder="Acts 2:38, John 3:5, Romans 6:3-4"/><small>Comma separated</small></label><label className="wide"><span>Description / notes</span><textarea name="description" rows={3} placeholder="What this resource covers and how it was used."/></label></div><label className="resource-check"><input type="checkbox" name="approved_for_members"/><span>Members may see this resource. Leave unchecked for leadership-only legacy/reference material.</span></label><button className="btn" disabled={busy}>{busy?'Uploading…':'Save to Resource Library'}</button>{message&&<div className="small muted" style={{marginTop:8}}>{message}</div>}</form>
}
