'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ImageUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export function EventFlyerUploader({churchId,eventId,currentPath}:{churchId:string;eventId:string;currentPath?:string|null}){
  const router=useRouter();const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  async function upload(file:File){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Use a JPG, PNG or WebP image.');return}
    if(file.size>10*1024*1024){setMessage('Flyer must be 10 MB or smaller.');return}
    setBusy(true);setMessage('')
    const supabase=createClient();const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const path=`${churchId}/${eventId}/flyer.${ext}`
    const {error:uploadError}=await supabase.storage.from('event-assets').upload(path,file,{upsert:true,contentType:file.type})
    if(uploadError){setMessage(uploadError.message);setBusy(false);return}
    const {error:updateError}=await supabase.from('events').update({flyer_path:path}).eq('id',eventId)
    if(updateError){setMessage(updateError.message);setBusy(false);return}
    if(currentPath&&currentPath!==path)await supabase.storage.from('event-assets').remove([currentPath])
    setMessage('Event flyer updated.');setBusy(false);router.refresh()
  }
  return <div className="event-flyer-upload"><label className="ghost" style={{cursor:'pointer'}}><ImageUp size={13}/>{busy?' Uploading…':' Flyer image'}<input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={e=>{const f=e.target.files?.[0];if(f)upload(f)}}/></label>{message&&<span className="small muted">{message}</span>}</div>
}
