'use client'

import {useRef,useState} from 'react'
import {UploadCloud} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'
import {registerCourseSourceUpload} from './actions'

const clean=(name:string)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-140)
const allowed=/\.(pdf|docx?|pptx?|txt|zip|jpg|jpeg|png|webp)$/i

export function CourseSourceUploader({churchId,courseId,lang}:{churchId:string;courseId:string;lang:'en'|'es'}){
  const es=lang==='es'
  const inputRef=useRef<HTMLInputElement>(null)
  const [busy,setBusy]=useState(false)
  const [message,setMessage]=useState('')
  const [dragging,setDragging]=useState(false)

  async function uploadFiles(files:File[]){
    const usable=files.filter(file=>allowed.test(file.name))
    if(!usable.length){setMessage(es?'Elige PDF, Word, PowerPoint, texto, ZIP o imágenes.':'Choose PDF, Word, PowerPoint, text, ZIP, or image files.');return}
    if(usable.some(file=>file.size>50*1024*1024)){setMessage(es?'Cada archivo debe ser de 50 MB o menos.':'Each file must be 50 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient()
    let finished=0
    try{
      for(const file of usable){
        const storagePath=`${churchId}/${courseId}/${crypto.randomUUID()}/${clean(file.name)}`
        const up=await supabase.storage.from('church-setup').upload(storagePath,file,{contentType:file.type,upsert:false})
        if(up.error)throw new Error(es?`No se pudo subir ${file.name}.`:`Could not upload ${file.name}.`)
        const registered=await registerCourseSourceUpload({courseId,fileName:file.name,storagePath,contentType:file.type,sizeBytes:file.size})
        if(!registered.ok){
          await supabase.storage.from('church-setup').remove([storagePath])
          throw new Error(registered.error||'Could not attach source file.')
        }
        finished+=1
        setMessage(es?`Conectados ${finished} de ${usable.length} archivos…`:`Connected ${finished} of ${usable.length} files…`)
      }
      setMessage(es?`${finished} archivo${finished===1?'':'s'} conectado${finished===1?'':'s'}. Actualizando…`:`${finished} source file${finished===1?'':'s'} connected. Refreshing…`)
      window.setTimeout(()=>window.location.reload(),500)
    }catch(error){
      setMessage(error instanceof Error?error.message:(es?'No se pudieron conectar los archivos.':'Could not connect the source files.'))
    }finally{setBusy(false)}
  }

  return <div>
    <div
      onDragOver={e=>{e.preventDefault();setDragging(true)}}
      onDragLeave={()=>setDragging(false)}
      onDrop={e=>{e.preventDefault();setDragging(false);void uploadFiles(Array.from(e.dataTransfer.files))}}
      onClick={()=>!busy&&inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')&&!busy)inputRef.current?.click()}}
      style={{border:'1px dashed rgba(255,255,255,.28)',borderRadius:14,padding:20,textAlign:'center',cursor:busy?'wait':'pointer',background:dragging?'rgba(255,255,255,.06)':'rgba(255,255,255,.02)'}}
    >
      <UploadCloud size={26}/>
      <strong style={{display:'block',marginTop:8}}>{es?'Suelta los archivos del curso aquí':'Drop course files here'}</strong>
      <span className="small muted">{es?'o haz clic para elegir varios archivos, incluso un ZIP':'or click to choose multiple files, including a ZIP'}</span>
      <input ref={inputRef} type="file" multiple hidden accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.jpg,.jpeg,.png,.webp" onChange={e=>void uploadFiles(Array.from(e.target.files??[]))}/>
    </div>
    {message&&<div className="small muted" style={{marginTop:8}}>{message}</div>}
  </div>
}
