'use client'

import { useState } from 'react'
import { Camera,Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ext=(file:File)=>file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'

export function AvatarUploader({userId,currentPath}:{userId:string;currentPath?:string|null}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 const supabase=createClient()
 const currentUrl=currentPath?supabase.storage.from('member-avatars').getPublicUrl(currentPath).data.publicUrl:null
 async function submit(formData:FormData){
  const file=formData.get('avatar') as File|null;if(!file||!file.size){setMessage('Choose a photo first.');return}
  if(file.size>5*1024*1024){setMessage('Photo must be 5 MB or smaller.');return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Use a JPG, PNG or WebP photo.');return}
  setBusy(true);setMessage('')
  const path=`${userId}/profile.${ext(file)}`
  if(currentPath&&currentPath!==path)await supabase.storage.from('member-avatars').remove([currentPath])
  const upload=await supabase.storage.from('member-avatars').upload(path,file,{contentType:file.type,upsert:true})
  if(upload.error){setMessage(upload.error.message);setBusy(false);return}
  const update=await supabase.from('profiles').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('id',userId)
  if(update.error){setMessage(update.error.message);setBusy(false);return}
  setMessage('Photo saved. Refreshing…');window.location.reload()
 }
 return <section className="card" style={{padding:20,marginBottom:18}}><div className="row" style={{gap:16,alignItems:'center',flexWrap:'wrap'}}>{currentUrl?<img src={currentUrl} alt="Profile" style={{width:92,height:92,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--line)'}}/>:<div className="avatar large" style={{width:92,height:92,fontSize:28}}><Camera size={30}/></div>}<div style={{flex:1,minWidth:220}}><div className="pill">PROFILE PHOTO</div><h3 style={{margin:'7px 0 4px'}}>Add a clear headshot.</h3><p className="small muted" style={{marginTop:0}}>A simple face photo helps leaders, groups and teams recognize each other. You can change it anytime.</p><form action={submit} className="row" style={{gap:8,flexWrap:'wrap',alignItems:'center'}}><input name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required/><button className="btn" disabled={busy}><Upload size={14}/>{busy?'Saving…':currentPath?'Replace photo':'Add my photo'}</button></form>{message&&<p className="small muted">{message}</p>}</div></div></section>
}
