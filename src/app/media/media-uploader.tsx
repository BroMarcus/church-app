'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const safe=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)
const split=(v:FormDataEntryValue|null)=>String(v??'').split(',').map(x=>x.trim()).filter(Boolean)

export function MediaUploader({churchId,userId,canApproveOfficial}:{churchId:string;userId:string;canApproveOfficial:boolean}){
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')

  async function submit(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setMessage('Choose a file first.');return}
    if(file.size>50*1024*1024){setMessage('File must be 50 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient()
    const path=`${churchId}/${userId}/${crypto.randomUUID()}/${safe(file.name)}`
    const upload=await supabase.storage.from('resource-library').upload(path,file,{contentType:file.type,upsert:false})
    if(upload.error){setMessage(upload.error.message);setBusy(false);return}
    const official=canApproveOfficial&&formData.get('official_source')==='on'
    const assetType=String(formData.get('asset_type')||'other')
    const insert=await supabase.from('media_assets').insert({
      church_id:churchId,uploaded_by:userId,library_kind:'media',title:String(formData.get('title')||file.name).trim(),asset_type:assetType,storage_path:path,
      description:String(formData.get('description')||'').trim()||null,resource_type:'media_asset',language_code:String(formData.get('language_code')||'en'),
      ministry_area:String(formData.get('ministry_area')||'').trim()||null,topic_tags:split(formData.get('topic_tags')),scripture_refs:[],archive_status:String(formData.get('archive_status')||'current'),
      source_label:String(formData.get('source_label')||'').trim()||null,approved_for_members:formData.get('approved_for_members')==='on',can_edit_copy:formData.get('can_edit_copy')==='on',
      source_scope:String(formData.get('source_scope')||'local_church'),official_source:official,reviewed_by:official?userId:null,reviewed_at:official?new Date().toISOString():null
    })
    if(insert.error){await supabase.storage.from('resource-library').remove([path]);setMessage(insert.error.message);setBusy(false);return}
    setMessage('Media saved. Refreshing…');window.location.reload()
  }

  return <form action={submit} className="card media-upload"><div className="media-upload-head"><div><div className="pill">ADD MEDIA</div><h2>Upload a reusable church asset</h2><p className="small muted">Flyers, invitations, sermon covers, photos, fundraiser graphics, slides and ministry media.</p></div><Upload/></div><div className="media-form-grid"><label><span>Title</span><input name="title" required placeholder="Youth Revival Flyer"/></label><label><span>Category</span><select name="asset_type" defaultValue="flyer"><option value="flyer">Flyer</option><option value="invitation">Invitation</option><option value="sermon_cover">Sermon cover</option><option value="fundraiser">Fundraiser graphic</option><option value="photo">Photo</option><option value="video">Video</option><option value="audio">Audio</option><option value="slides">Slides</option><option value="other">Other</option></select></label><label><span>Ministry / team</span><input name="ministry_area" placeholder="Youth, Worship, First Steps…"/></label><label><span>Language</span><select name="language_code" defaultValue="en"><option value="en">English</option><option value="es">Español</option><option value="bilingual">Bilingual</option></select></label><label><span>Scope</span><select name="source_scope" defaultValue="local_church"><option value="local_church">Whole church</option><option value="ministry">Ministry</option><option value="group">Friendship group</option><option value="external">External reference</option>{canApproveOfficial&&<><option value="district">District</option><option value="organization">Organization / Assembly</option></>}</select></label><label><span>Status</span><select name="archive_status" defaultValue="current"><option value="current">Current / ready to use</option><option value="draft">Draft</option><option value="reference_only">Reference only</option><option value="legacy">Legacy</option><option value="retired">Retired</option></select></label><label className="wide"><span>Tags</span><input name="topic_tags" placeholder="easter, youth, outreach, fundraiser"/><small>Comma separated</small></label><label className="wide"><span>Description</span><textarea name="description" rows={3} placeholder="What this asset is for and when members should use it."/></label><label className="wide"><span>Source / campaign label</span><input name="source_label" placeholder="Easter 2026, Youth Department, Sunday Series…"/></label><label className="wide"><span>File</span><input name="file" type="file" required accept=".pdf,.pptx,.jpg,.jpeg,.png,.webp,.mp4,.mp3"/></label></div><label className="media-check"><input type="checkbox" name="approved_for_members" defaultChecked/><span>Members may see and download this asset.</span></label><label className="media-check"><input type="checkbox" name="can_edit_copy" defaultChecked/><span>Members may reuse or adapt this asset for church/ministry use.</span></label>{canApproveOfficial&&<label className="media-check"><input type="checkbox" name="official_source"/><span>Mark as an official church / district / organization-approved asset.</span></label>}<button className="btn" disabled={busy}>{busy?'Uploading…':'Add to Media Library'}</button>{message&&<div className="small muted" style={{marginTop:8}}>{message}</div>}</form>
}
