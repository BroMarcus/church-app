'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const clean=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140)
type UploadStatus={kind:'success'|'error';message:string}|null

export function SetupUploader({churchId,userId,lang}:{churchId:string;userId:string;lang:'en'|'es'}){
 const [saving,setSaving]=useState(false),[status,setStatus]=useState<UploadStatus>(null)
 const es=lang==='es'
 const fail=(message?:string)=>setStatus({kind:'error',message:message||(es?'No se pudo subir el archivo. Inténtalo de nuevo.':'The file could not be uploaded. Try again.')})
 async function submit(formData:FormData){
  const file=formData.get('file') as File|null
  if(!file||!file.size){fail(es?'Selecciona un archivo primero.':'Choose a file first.');return}
  if(file.size>20*1024*1024){fail(es?'El archivo debe ser de 20 MB o menos.':'File must be 20 MB or smaller.');return}
  setSaving(true);setStatus(null)
  const supabase=createClient();const path=`${churchId}/${crypto.randomUUID()}/${clean(file.name)}`
  try{
   const upload=await supabase.storage.from('church-setup').upload(path,file,{contentType:file.type,upsert:false})
   if(upload.error){console.error('SetupUploader storage upload failed',{churchId,code:upload.error.name});fail();return}
   const category=String(formData.get('category')||'unsorted')
   const insert=await supabase.from('church_setup_uploads').insert({church_id:churchId,uploaded_by:userId,file_name:file.name,storage_path:path,content_type:file.type||null,size_bytes:file.size,category,notes:String(formData.get('notes')||'').trim()||null,suggested_destination:category==='curriculum'?'Learning Center':category==='branding'?'Church Settings / Media':category==='leadership'?'Leadership records':category==='forms'?'Forms & workflows':category==='calendar'?'Calendar':'Kingdom Guide review queue'})
   if(insert.error){console.error('SetupUploader metadata insert failed',{churchId,code:insert.error.code});const cleanup=await supabase.storage.from('church-setup').remove([path]);if(cleanup.error)console.error('SetupUploader cleanup failed',{churchId,code:cleanup.error.name});fail();return}
   setStatus({kind:'success',message:es?'Recibido. Kingdom Network lo agregó a la bandeja de configuración.':'Received. Kingdom Network added it to the setup inbox.'})
   window.setTimeout(()=>window.location.reload(),700)
  }catch(error){console.error('SetupUploader unexpected failure',{churchId,error});fail()}
  finally{setSaving(false)}
 }
 return <form action={submit} className="card" style={{padding:20,display:'grid',gap:12}}><div><div className="pill"><Upload size={12}/> {es?'SUBIR Y ORGANIZAR':'UPLOAD & ORGANIZE'}</div><h2>{es?'Danos lo que ya tienes.':'Give us what you already have.'}</h2><p className="muted">{es?'Sube manuales, formularios, logos, políticas, calendarios o material de clases. No necesitas saber dónde va cada cosa.':'Upload manuals, forms, logos, policies, calendars or class material. You do not need to know where everything belongs.'}</p></div><label className="field"><span>{es?'Tipo de material':'What kind of material?'}</span><select name="category" defaultValue="unsorted"><option value="unsorted">{es?'No estoy seguro':'I am not sure'}</option><option value="curriculum">{es?'Clases / currículo':'Classes / curriculum'}</option><option value="forms">{es?'Formularios':'Forms'}</option><option value="branding">{es?'Logo / marca':'Logo / branding'}</option><option value="leadership">{es?'Liderazgo':'Leadership'}</option><option value="policies">{es?'Políticas':'Policies'}</option><option value="certificates">{es?'Certificados':'Certificates'}</option><option value="media">{es?'Fotos / medios':'Photos / media'}</option><option value="calendar">{es?'Calendario / eventos':'Calendar / events'}</option><option value="other">{es?'Otro':'Other'}</option></select></label><label className="field"><span>{es?'Archivo':'File'}</span><input name="file" type="file" required accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"/></label><label className="field"><span>{es?'¿Algo que debamos saber?':'Anything we should know?'}</span><textarea name="notes" rows={3} placeholder={es?'Ej. Estas son nuestras clases para nuevos convertidos.':'e.g. These are our new-convert classes.'}/></label><button className="btn" disabled={saving}>{saving?(es?'Subiendo…':'Uploading…'):(es?'Subir a Kingdom Network':'Upload to Kingdom Network')}</button>{status&&<div className={`notice ${status.kind}`}>{status.message}</div>}<small className="muted">{es?'PDF, Word, PowerPoint, texto e imágenes • máximo 20 MB por archivo':'PDF, Word, PowerPoint, text and images • 20 MB max per file'}</small></form>
}
