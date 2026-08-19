'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const cleanName=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-120)

export function DocumentUploader({churchId,userId,lang='en'}:{churchId:string;userId:string;lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en
  const [saving,setSaving]=useState(false),[status,setStatus]=useState('')
  async function submit(formData:FormData){
    const file=formData.get('file') as File|null
    if(!file||!file.size){setStatus(t('Choose a PDF or image first.','Elige primero un PDF o imagen.'));return}
    if(file.size>10*1024*1024){setStatus(t('File must be 10 MB or smaller.','El archivo debe ser de 10 MB o menos.'));return}
    setSaving(true);setStatus('')
    const supabase=createClient(),path=`${userId}/${crypto.randomUUID()}/${cleanName(file.name)}`
    const upload=await supabase.storage.from('member-documents').upload(path,file,{upsert:false,contentType:file.type})
    if(upload.error){setStatus(upload.error.message);setSaving(false);return}
    const insert=await supabase.from('member_documents').insert({church_id:churchId,owner_user_id:userId,document_type:String(formData.get('document_type')||'other'),title:String(formData.get('title')||file.name).trim(),storage_path:path,issuer:String(formData.get('issuer')||'').trim()||null,issued_at:String(formData.get('issued_at')||'')||null,expires_at:String(formData.get('expires_at')||'')||null,notes:String(formData.get('notes')||'').trim()||null,verification_status:'pending_review'})
    if(insert.error){await supabase.storage.from('member-documents').remove([path]);setStatus(insert.error.message);setSaving(false);return}
    setStatus(t('Uploaded. Refreshing…','Subido. Actualizando…'));window.location.reload()
  }
  return <details className="card upload-card"><summary style={{fontWeight:800,cursor:'pointer'}}><Upload size={16}/> {t('Upload a document','Subir un documento')}</summary><form action={submit} style={{marginTop:14}}><div className="pill">{t('PRIVATE VAULT','BÓVEDA PRIVADA')}</div><p className="small muted">{t('PDF, JPG, PNG or WEBP • 10 MB max • visible only to you and authorized church leadership.','PDF, JPG, PNG o WEBP • máximo 10 MB • visible solo para ti y liderazgo autorizado.')}</p><div className="doc-form-grid"><label className="field"><span>{t('Document title','Título del documento')}</span><input name="title" required placeholder={t('e.g. Training Certificate','ej. Certificado de capacitación')}/></label><label className="field"><span>{t('Type','Tipo')}</span><select name="document_type" defaultValue="training_certificate"><option value="training_certificate">{t('Training certificate','Certificado de capacitación')}</option><option value="credential">{t('Credential / license','Credencial / licencia')}</option><option value="ministry_form">{t('Ministry form','Formulario de ministerio')}</option><option value="covenant">{t('Covenant','Pacto')}</option><option value="baptism_record">{t('Baptism record','Registro de bautismo')}</option><option value="course_certificate">{t('Course certificate','Certificado de curso')}</option><option value="other">{t('Other','Otro')}</option></select></label><label className="field"><span>{t('Issuer / organization','Emisor / organización')}</span><input name="issuer" placeholder={t('Who issued it?','¿Quién lo emitió?')}/></label><label className="field"><span>{t('Issued date','Fecha de emisión')}</span><input name="issued_at" type="date"/></label><label className="field"><span>{t('Expiration date','Fecha de vencimiento')}</span><input name="expires_at" type="date"/></label><label className="field"><span>{t('File','Archivo')}</span><input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp"/></label></div><label className="field"><span>{t('Notes','Notas')}</span><textarea name="notes" rows={3} placeholder={t('Optional details for church leadership','Detalles opcionales para el liderazgo')}/></label><button className="btn" disabled={saving}>{saving?t('Uploading…','Subiendo…'):t('Upload document','Subir documento')}</button>{status&&<div className="small" style={{marginTop:9}}>{status}</div>}</form></details>
}