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
 const failCleanupUncertain=()=>fail(es?'No pudimos terminar ni confirmar la limpieza de este archivo. No vuelvas a subir este mismo archivo todavía. Inténtalo más tarde o pide ayuda si se repite.':'We could not finish or confirm cleanup for this file. Do not upload this same file again yet. Try later or ask for help if it repeats.')
 const savedButRefreshFailed=()=>setStatus({kind:'success',message:es?'El archivo sí se guardó, pero esta página no se actualizó. No vuelvas a subirlo. Toca “Recargar bandeja” para confirmar que aparece.':'The file was saved, but this page did not refresh. Do not upload it again. Tap “Reload inbox” to confirm it appears.'})
 async function submit(formData:FormData){
  if(saving)return
  const file=formData.get('file') as File|null
  if(!file||!file.size){fail(es?'Selecciona un archivo primero.':'Choose a file first.');return}
  if(file.size>20*1024*1024){fail(es?'El archivo debe ser de 20 MB o menos.':'File must be 20 MB or smaller.');return}
  const extension=file.name.toLowerCase().match(/\.[^.]+$/)?.[0]??''
  if(!allowedExtensions.has(extension)||(file.type&&!allowedTypes.has(file.type))){fail(es?'Ese tipo de archivo no está permitido. Usa PDF, Word, PowerPoint, texto o una imagen.':'That file type is not allowed. Use PDF, Word, PowerPoint, text, or an image.');return}
  setSaving(true);setStatus(null)
  let unlockAfterAttempt=true
  let metadataCommitted=false
  try{
   const supabase=createClient();const path=`${churchId}/${crypto.randomUUID()}/${clean(file.name)}`
   const upload=await supabase.storage.from('church-setup').upload(path,file,{contentType:file.type||undefined,upsert:false})
   if(upload.error){console.error('SetupUploader storage upload failed',{churchId,code:boundedCode(upload.error)});fail();return}
   const cleanupUploadedFile=async()=>{
    for(let attempt=1;attempt<=2;attempt++){
     try{
      const cleanup=await supabase.storage.from('church-setup').remove([path])
      const confirmedDeleted=!cleanup.error&&Array.isArray(cleanup.data)&&cleanup.data.some(item=>typeof item?.name==='string'&&(item.name===path||path.endsWith(`/${item.name}`)))
      if(confirmedDeleted)return true
      if(cleanup.error)console.error('SetupUploader cleanup failed',{churchId,attempt,code:boundedCode(cleanup.error)})
      else console.error('SetupUploader cleanup unconfirmed',{churchId,attempt,code:'DELETE_NOT_CONFIRMED'})
     }catch(error){console.error('SetupUploader cleanup transport failed',{churchId,attempt,code:boundedCode(error)})}
    }
    return false
   }
   const categoryValue=String(formData.get('category')||'unsorted'),category=allowedCategories.has(categoryValue)?categoryValue:'unsorted'
   const notes=String(formData.get('notes')||'').trim().slice(0,1000)||null
   let insert
   try{
    insert=await supabase.from('church_setup_uploads').insert({church_id:churchId,uploaded_by:userId,file_name:file.name.slice(0,255),storage_path:path,content_type:file.type||null,size_bytes:file.size,category,notes,suggested_destination:category==='curriculum'?'Learning Center':category==='branding'?'Church Settings / Media':category==='leadership'?'Leadership records':category==='forms'?'Forms & workflows':category==='calendar'?'Calendar':'Kingdom Guide review queue'})
   }catch(error){
    console.error('SetupUploader metadata insert transport failed',{churchId,code:boundedCode(error)})
    if(!(await cleanupUploadedFile())){failCleanupUncertain();return}
    fail();return
   }
   if(insert.error){
    console.error('SetupUploader metadata insert failed',{churchId,code:boundedCode(insert.error)})
    if(!(await cleanupUploadedFile())){failCleanupUncertain();return}
    fail();return
   }
   metadataCommitted=true
   unlockAfterAttempt=false
   setStatus({kind:'success',message:es?'Recibido. Kingdom Network lo agregó a la bandeja de configuración. Actualizando la página…':'Received. Kingdom Network added it to the setup inbox. Refreshing the page…'})
   window.setTimeout(()=>window.location.reload(),700)
  }catch(error){
   console.error('SetupUploader unexpected failure',{churchId,code:boundedCode(error),phase:metadataCommitted?'post_commit':'pre_commit'})
   if(metadataCommitted){unlockAfterAttempt=false;savedButRefreshFailed()}
   else fail()
  }
  finally{if(unlockAfterAttempt)setSaving(false)}
 }
 const uploadSaved=status?.kind==='success'&&saving
 return <form action={submit} className="card" style={{padding:20,display:'grid',gap:12}}><div><div className="pill"><Upload size={12}/> {es?'SUBIR Y ORGANIZAR':'UPLOAD & ORGANIZE'}</div><h2>{es?'Danos lo que ya tienes.':'Give us what you already have.'}</h2><p className="muted">{es?'Sube manuales, formularios, logos, políticas, calendarios o material de clases. No necesitas saber dónde va cada cosa.':'Upload manuals, forms, logos, policies, calendars or class material. You do not need to know where everything belongs.'}</p></div><div className="notice" role="note"><strong>{es?'Para pruebas del piloto:':'For pilot testing:'}</strong> {es?'usa solamente material de prueba o contenido seguro de la iglesia. No subas expedientes reales de miembros, notas pastorales privadas, archivos financieros, contraseñas ni códigos de acceso.':'use only test material or safe church content. Do not upload real member records, private pastoral notes, finance files, passwords, or access codes.'}</div><label className="field"><span>{es?'Tipo de material':'What kind of material?'}</span><select name="category" defaultValue="unsorted" disabled={saving}><option value="unsorted">{es?'No estoy seguro':'I am not sure'}</option><option value="curriculum">{es?'Clases / currículo':'Classes / curriculum'}</option><option value="forms">{es?'Formularios':'Forms'}</option><option value="branding">{es?'Logo / marca':'Logo / branding'}</option><option value="leadership">{es?'Liderazgo':'Leadership'}</option><option value="policies">{es?'Políticas':'Policies'}</option><option value="certificates">{es?'Certificados':'Certificates'}</option><option value="media">{es?'Fotos / medios':'Photos / media'}</option><option value="calendar">{es?'Calendario / eventos':'Calendar / events'}</option><option value="other">{es?'Otro':'Other'}</option></select></label><label className="field"><span>{es?'Archivo':'File'}</span><input name="file" type="file" required disabled={saving} accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,image/jpeg,image/png,image/webp"/></label><label className="field"><span>{es?'¿Algo que debamos saber?':'Anything we should know?'}</span><textarea name="notes" rows={3} maxLength={1000} disabled={saving} placeholder={es?'Ej. Estas son nuestras clases para nuevos convertidos.':'e.g. These are our new-convert classes.'}/></label><button className="btn" type="submit" disabled={saving} aria-disabled={saving} aria-busy={saving}>{saving?(es?'Subiendo…':'Uploading…'):(es?'Subir a Kingdom Network':'Upload to Kingdom Network')}</button><div className="small muted">{saving?(uploadSaved?(es?'El archivo ya fue guardado. No lo vuelvas a subir.':'The file has already been saved. Do not upload it again.'):(es?'Mantén esta página abierta hasta que termine.':'Keep this page open until the upload finishes.')):(es?'Toca Subir una sola vez.':'Tap Upload once.')}</div>{status&&<div className={`notice ${status.kind}`} role={status.kind==='error'?'alert':'status'} aria-live="polite">{status.message}</div>}{uploadSaved&&<button className="ghost" type="button" onClick={()=>window.location.reload()}>{es?'Recargar bandeja':'Reload inbox'}</button>}<small className="muted">{es?'PDF, Word, PowerPoint, texto e imágenes • máximo 20 MB por archivo':'PDF, Word, PowerPoint, text and images • 20 MB max per file'}</small></form>
}