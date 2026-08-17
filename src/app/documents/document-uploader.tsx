'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const cleanName=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)

export function DocumentUploader({churchId,userId}:{churchId:string;userId:string}){
  const [saving,setSaving]=useState(false)
  const [status,setStatus]=useState('')
  async function submit(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setStatus('Choose a PDF or image first.');return}
    if(file.size>10*1024*1024){setStatus('File must be 10 MB or smaller.');return}
    setSaving(true);setStatus('')
    const supabase=createClient()
    const path=`${userId}/${crypto.randomUUID()}/${cleanName(file.name)}`
    const upload=await supabase.storage.from('member-documents').upload(path,file,{upsert:false,contentType:file.type})
    if(upload.error){setStatus(upload.error.message);setSaving(false);return}
    const insert=await supabase.from('member_documents').insert({
      church_id:churchId,owner_user_id:userId,document_type:String(formData.get('document_type')||'other'),title:String(formData.get('title')||file.name).trim(),storage_path:path,
      issuer:String(formData.get('issuer')||'').trim()||null,issued_at:String(formData.get('issued_at')||'')||null,expires_at:String(formData.get('expires_at')||'')||null,
      notes:String(formData.get('notes')||'').trim()||null,verification_status:'pending_review'
    })
    if(insert.error){await supabase.storage.from('member-documents').remove([path]);setStatus(insert.error.message);setSaving(false);return}
    setStatus('Uploaded. Refreshing…');window.location.reload()
  }
  return <form action={submit} className="card upload-card"><div className="section-heading"><div><div className="pill">PRIVATE VAULT</div><h2>Upload a document</h2></div><Upload/></div><p className="small muted">PDF, JPG, PNG or WEBP • 10 MB max • visible only to you and authorized church leadership.</p><div className="doc-form-grid"><label className="field"><span>Document title</span><input name="title" required placeholder="e.g. Child Abuse Training Certificate"/></label><label className="field"><span>Type</span><select name="document_type" defaultValue="training_certificate"><option value="training_certificate">Training certificate</option><option value="credential">Credential / license</option><option value="ministry_form">Ministry form</option><option value="covenant">Covenant</option><option value="baptism_record">Baptism record</option><option value="course_certificate">Course certificate</option><option value="other">Other</option></select></label><label className="field"><span>Issuer / organization</span><input name="issuer" placeholder="Who issued it?"/></label><label className="field"><span>Issued date</span><input name="issued_at" type="date"/></label><label className="field"><span>Expiration date</span><input name="expires_at" type="date"/></label><label className="field"><span>File</span><input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp"/></label></div><label className="field"><span>Notes</span><textarea name="notes" rows={3} placeholder="Optional details for church leadership"/></label><button className="btn" disabled={saving}>{saving?'Uploading…':'Upload document'}</button>{status&&<div className="small" style={{marginTop:9}}>{status}</div>}</form>
}
