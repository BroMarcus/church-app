'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function LogoUploader({churchId,currentPath,lang='en'}:{churchId:string;currentPath?:string|null;lang?:'en'|'es'}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  const es=lang==='es'
  async function upload(file:File){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage(es?'Usa una imagen JPG, PNG o WebP.':'Use a JPG, PNG or WebP image.');return}
    if(file.size>5*1024*1024){setMessage(es?'El logo debe medir 5 MB o menos.':'Logo must be 5 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient();const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${churchId}/logo.${ext}`
    const {error:uploadError}=await supabase.storage.from('church-branding').upload(path,file,{upsert:true,contentType:file.type})
    if(uploadError){setMessage(uploadError.message);setBusy(false);return}
    const {error:updateError}=await supabase.from('churches').update({logo_path:path}).eq('id',churchId)
    if(updateError){setMessage(updateError.message);setBusy(false);return}
    if(currentPath&&currentPath!==path)await supabase.storage.from('church-branding').remove([currentPath])
    setMessage(es?'Logo de la iglesia actualizado.':'Church logo updated.');setBusy(false);router.refresh()
  }
  return <div className="logo-uploader"><label className="ghost" style={{cursor:'pointer'}}><ImageUp size={14}/>{busy?(es?' Subiendo…':' Uploading…'):(es?' Subir logo de la iglesia':' Upload church logo')}<input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></label>{message&&<span className="small muted">{message}</span>}</div>
}
