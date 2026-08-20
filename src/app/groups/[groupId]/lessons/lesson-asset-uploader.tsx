'use client'

import {useState} from 'react'
import {FileUp} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'

const allowed=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword','image/jpeg','image/png']

export function LessonAssetUploader({churchId,groupId,userId,name='source_asset_path'}:{churchId:string;groupId:string;userId:string;name?:string}){
 const [path,setPath]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 async function upload(file:File|null){
  if(!file){setPath('');setMessage('');return}
  if(file.size>8*1024*1024){setMessage('File must be 8 MB or smaller.');return}
  if(!allowed.includes(file.type)){setMessage('Use PDF, Word, JPG or PNG.');return}
  setBusy(true);setMessage('Uploading…')
  const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'-').slice(-120),objectPath=`${churchId}/${groupId}/${userId}/${crypto.randomUUID()}/${safe}`
  const {error}=await createClient().storage.from('group-lesson-assets').upload(objectPath,file,{contentType:file.type,upsert:false})
  if(error){console.error('lesson asset upload failed',error);setMessage('We could not upload that lesson file.');setBusy(false);return}
  setPath(objectPath);setMessage(`${file.name} uploaded and ready to save.`);setBusy(false)
 }
 return <div className="field"><span>Lesson file (optional)</span><input type="hidden" name={name} value={path}/><label className="ghost" style={{display:'inline-flex',cursor:busy?'wait':'pointer',width:'fit-content'}}><FileUp size={15}/>{busy?'Uploading…':'Choose PDF, Word or image'}<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={busy} onChange={e=>upload(e.target.files?.[0]??null)} style={{position:'absolute',width:1,height:1,overflow:'hidden',clip:'rect(0 0 0 0)'}}/></label>{message&&<span className="small muted">{message}</span>}</div>
}
