'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const clean=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140)||'upload'
const allowedTypes=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain','image/jpeg','image/png','image/webp'])
const allowedExtensions=new Set(['.pdf','.doc','.docx','.ppt','.pptx','.txt','.jpg','.jpeg','.png','.webp'])
const allowedCategories=new Set(['unsorted','curriculum','forms','branding','leadership','policies','certificates','media','calendar','other'])
type UploadStatus={kind:'success'|'error';message:string}|null

const boundedCode=(error:unknown)=>{
 if(error&&typeof error==='object'){
  const value='code' in error?(error as {code?:unknown}).code:'name' in error?(error as {name?:unknown}).name:'unknown'
  return String(value||'unknown').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'unknown'
 }
 return 'unknown'
}

export function SetupUploader({churchId,userId,lang}:{churchId:string;userId:string;lang:'en'|'es'}){
 const [saving,setSaving]=useState(false),[status,setStatus]=useState<UploadStatus>(null)
 const es=lang==='es'
 const fail=(message?:string)=>setStatus({kind:'error',message:message||(es?'No se pudo subir el archivo. Inténtalo de nuevo.':'The file could not be uploaded. Try again.')})
 async function submit(formData:FormData){
  if(saving)return
  const file=formData.get('file') as File|null
  if(!file||!file.size){fail(es?'Selecciona un archivo primero.':'Choose a file first.');return}
  if(file.size>20*1024*1024){fail(es?'El archivo debe ser de 20 MB o menos.':'File must be 20 MB or smaller.');return}
  const extension=file.name.toLowerCase().match(/\.[^.]+$/)?.[0]??''
  if(!allowedExtensions.has(extension)||(file.type&&!allowedTypes.has(file.type))){fail(es?'Ese tipo de archivo no está permitido. Usa PDF, Word, PowerPoint, texto o una imagen.':'That file type is not allowed. Use PDF, Word, PowerPoint, text, or an image.');return}
  setSaving(true);setStatus(null)
  try{
   const supabase=createClient();const path=`${churchId}/${crypto.randomUUID()}/${clean(file.name)}`
   const upload=await supabase.storage.from('church-setup').upload(path,file,{contentType:file.type||undefined,upsert:false})
   if(upload.error){console.error('SetupUploader storage upload failed',{churchId,code:boundedCode(upload.error)});fail();return}
   const categoryValue=String(formData.get('category')||'unsorted'),category=allowedCategories.has(categoryValue)?categoryValue:'unsorted'
   const notes=String(formData.get('notes')||'').trim().slice(0,1000)||null
   const insert=await supabase.from('church_setup_uploads').insert({church_id:churchId,uploaded_by:userId,file_name:file.name.slice(0,255),storage_path:path,content_type:file.type||null,size_bytes:file.size,category,notes,suggested_destination:category==='curriculum'?'Learning Center':category==='branding'?'Church Settings / Media':category==='leadership'?'Leadership records':category==='forms'?'Forms & workflows':category==='calendar'?'Calendar':'Kingdom Guide review queue'})
   if(insert.error){
    console.error('SetupUploader metadata insert failed',{churchId,code:boundedCode(insert.error)})
    let cleanupConfirmed=false
    for(let attempt=1;attempt<=2&&!cleanupConfirmed;attempt++){
     try{
      const cleanup=await supabase.storage.from('church-setup').remove([path])
      if(cleanup.error)console.error('SetupUploader cleanup failed',{churchId,attempt,code:boundedCode(cleanup.error)})
      else cleanupConfirmed=true
     }catch(error){console.error('SetupUploader cleanup transport failed',{churchId,attempt,code:boundedCode(error)})}
    }
    if(!cleanupConfirmed){
     fail(es?'No pudimos terminar ni confirmar la limpieza de este archivo. No vuelvas a subir este mismo archivo todavía. Inténtalo más tarde o pide ayuda si se repite.':'We could not finish or confirm cleanup for this file. Do not upload this same file again yet. Try later or ask for help if it repeats.')
     return
    }
    fail();return
   }
   setStatus({kind:'success',message:es?'Recibido. Kingdom Network lo agregó a la bandeja de configuración.':'Received. Kingdom Network added it to the setup inbox.'})
   window.setTimeout(()=>window.location.reload(),700)
  }catch(error){console.error('SetupUploader unexpected failure',{churchId,code:boundedCode(error)});fail()}
  finally{setSaving(false)}
 }
 return <form action={submit} className="card" style={{padding:20,display:'grid',gap:12}}><div><div className="pill"><Upload size={12}/> {es?'SUBIR Y ORGANIZAR':'UPLOAD & ORGANIZE'}</div><h2>{es?'Danos lo que ya tienes.':'Give us what you already have.'}</h2><p className="muted">{es?'Sube manuales, formularios, logos, políticas, calendarios o material de clases. No necesitas saber dónde va cada cosa.':'Upload manuals, forms, logos, policies, calendars or class material. You do not need to know where everything belongs.'}</p></div><div className="notice" role="note"><strong>{es?'Para pruebas del piloto:':'For pilot testing:'}</strong> {es?'usa solamente material de prueba o contenido seguro de la iglesia. No subas expedientes reales de miembros, notas pastorales privadas, archivos financieros, contraseñas ni códigos de acceso.':'use only test material or safe church content. Do not upload real member records, private pastoral notes, finance files, passwords, or access codes.'}</div><label className="field"><span>{es?'Tipo de material':'What kind of material?'}</span><select name="category" defaultValue="unsorted" disabled={saving}><option value="unsorted">{es?'No estoy seguro':'I am not sure'}</option><option value="curriculum">{es?'Clases / currículo':'Classes / curriculum'}</option><option value="forms">{es?'Formularios':'Forms'}</option><option value="branding">{es?'Logo / marca':'Logo / branding'}</option><option value="leadership">{es?'Liderazgo':'Leadership'}</option><option value="policies">{es?'Políticas':'Policies'}</option><option value="certificates">{es?'Certificados':'Certificates'}</option><option value="media">{es?'Fotos / medios':'Photos / media'}</option><option value="calendar">{es?'Calendario / eventos':'Calendar / events'}</option><option value="other">{es?'Otro':'Other'}</option></select></label><label className="field"><span>{es?'Archivo':'File'}</span><input name="file" type="file" required disabled={saving} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"/></label><label className="field"><span>{es?'¿Algo que debamos saber?':'Anything we should know?'}</span><textarea name="notes" rows={3} maxLength={1000} disabled={saving} placeholder={es?'Ej. Estas son nuestras clases para nuevos convertidos.':'e.g. These are our new-convert classes.'}/></label><button className="btn" type="submit" disabled={saving} aria-disabled={saving} aria-busy={saving}>{saving?(es?'Subiendo…':'Uploading…'):(es?'Subir a Kingdom Network':'Upload to Kingdom Network')}</button><div className="small muted">{saving?(es?'Mantén esta página abierta hasta que termine.':'Keep this page open until the upload finishes.'):(es?'Toca Subir una sola vez.':'Tap Upload once.')}</div>{status&&<div className={`notice ${status.kind}`} role={status.kind==='error'?'alert':'status'} aria-live="polite">{status.message}</div>}<small className="muted">{es?'PDF, Word, PowerPoint, texto e imágenes • máximo 20 MB por archivo':'PDF, Word, PowerPoint, text and images • 20 MB max per file'}</small></form>
}
