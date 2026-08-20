'use client'

import { useRef,useState } from 'react'
import { Camera,Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ext=(file:File)=>file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'

export function AvatarUploader({userId,currentPath}:{userId:string;currentPath?:string|null}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[file,setFile]=useState<File|null>(null)
 const inputRef=useRef<HTMLInputElement>(null),supabase=createClient()
 const currentUrl=currentPath?supabase.storage.from('member-avatars').getPublicUrl(currentPath).data.publicUrl:null
 async function submit(e:React.FormEvent){
  e.preventDefault();if(!file||!file.size){setMessage('Choose a photo first.');return}
  if(file.size>5*1024*1024){setMessage('Photo must be 5 MB or smaller.');return}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){setMessage('Use a JPG, PNG or WebP photo.');return}
  setBusy(true);setMessage('')
  const path=`${userId}/profile.${ext(file)}`
  if(currentPath&&currentPath!==path)await supabase.storage.from('member-avatars').remove([currentPath])
  const upload=await supabase.storage.from('member-avatars').upload(path,file,{contentType:file.type,upsert:true})
  if(upload.error){setMessage('We could not upload that photo. Please try again.');setBusy(false);return}
  const update=await supabase.from('profiles').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('id',userId)
  if(update.error){setMessage('The photo uploaded, but your profile could not be updated. Please try again.');setBusy(false);return}
  setMessage('Photo saved. Refreshing…');window.location.reload()
 }
 return <section className="card" style={{padding:20,marginBottom:18}}><div className="row" style={{gap:16,alignItems:'center',flexWrap:'wrap'}}><button type="button" onClick={()=>inputRef.current?.click()} aria-label={currentPath?'Change profile photo':'Add profile photo'} title={currentPath?'Change profile photo':'Add profile photo'} style={{position:'relative',padding:0,border:0,borderRadius:'50%',background:'transparent',cursor:'pointer'}}>{currentUrl?<img src={currentUrl} alt="Profile" style={{width:92,height:92,borderRadius:'50%',objectFit:'cover',border:'2px solid var(--line)'}}/>:<div className="avatar large" style={{width:92,height:92,fontSize:28}}><Camera size={30}/></div>}<span style={{position:'absolute',right:0,bottom:2,width:30,height:30,borderRadius:'50%',display:'grid',placeItems:'center',background:'var(--panel)',border:'1px solid var(--line)'}}><Camera size={15}/></span></button><div style={{flex:1,minWidth:220}}><div className="pill">PROFILE PHOTO</div><h3 style={{margin:'7px 0 4px'}}>Add a clear headshot to your profile.</h3><p className="small muted" style={{marginTop:0}}>A simple face photo helps leaders, groups and teams recognize each other. You can change it anytime.</p><form onSubmit={submit} className="row" style={{gap:8,flexWrap:'wrap',alignItems:'center'}}><input ref={inputRef} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const next=e.target.files?.[0]??null;setFile(next);setMessage(next?next.name:'')}} style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}}/><button type="button" className="ghost" onClick={()=>inputRef.current?.click()} disabled={busy}><Camera size={14}/>{currentPath?'Choose a new photo':'Choose photo'}</button><button className="btn" disabled={busy||!file}><Upload size={14}/>{busy?'Saving…':currentPath?'Save new photo':'Save photo'}</button></form>{message&&<p className="small muted">{message}</p>}</div></div></section>
}
