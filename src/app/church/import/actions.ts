'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { parseCsv,type CsvRecord } from '@/lib/csv-parse'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const emailOk=(v:string)=>!v||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
const outreachStages=new Set(['new_contact','invited','guest','bible_study','regular_attendee','baptized','holy_ghost','first_steps','connected','serving','inactive'])
const inviteRoles=new Set(['member','group_leader','ministry_leader','minister'])
const pick=(r:CsvRecord,...keys:string[])=>{for(const k of keys){if(r[k])return r[k]}return ''}

async function admin(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
  return {supabase,userId,churchId:membership.church_id}
}

function canonicalize(dataset:string,r:CsvRecord){
  if(dataset==='outreach')return {
    first_name:pick(r,'first_name','firstname','first'),
    last_name:pick(r,'last_name','lastname','last'),
    email:pick(r,'email','email_address').toLowerCase(),
    phone:pick(r,'phone','phone_number','mobile'),
    stage:(pick(r,'stage')||'new_contact').toLowerCase().replaceAll(' ','_'),
    notes:pick(r,'notes','note')
  }
  return {
    first_name:pick(r,'first_name','firstname','first'),
    last_name:pick(r,'last_name','lastname','last'),
    email:pick(r,'email','email_address').toLowerCase(),
    phone:pick(r,'phone','phone_number','mobile'),
    role:(pick(r,'role')||'member').toLowerCase().replaceAll(' ','_')
  }
}

function validate(dataset:string,row:any,seen:Set<string>){
  const errors:string[]=[]
  if(dataset==='outreach'){
    if(!row.first_name)errors.push('First name is required.')
    if(!emailOk(row.email))errors.push('Email format is invalid.')
    if(!outreachStages.has(row.stage))errors.push('Stage is not recognized.')
    const key=[row.first_name,row.last_name,row.email||row.phone].map((v:string)=>String(v||'').trim().toLowerCase()).join('|')
    if(key.endsWith('|')){}else if(seen.has(key))errors.push('Duplicate person inside this CSV.');else seen.add(key)
  }else{
    if(!row.email)errors.push('Email is required.')
    else if(!emailOk(row.email))errors.push('Email format is invalid.')
    if(!inviteRoles.has(row.role))errors.push('Role must be member, group_leader, ministry_leader or minister.')
    const key=row.email.toLowerCase()
    if(key&&seen.has(key))errors.push('Duplicate email inside this CSV.');else if(key)seen.add(key)
  }
  return errors.join(' ')
}

export async function stageChurchImport(formData:FormData){
  const {supabase,userId,churchId}=await admin()
  const dataset=text(formData,'dataset_type')
  if(!['outreach','member_invites'].includes(dataset))redirect('/church/import?error='+encodeURIComponent('Choose a valid import type.'))
  const file=formData.get('file')
  if(!(file instanceof File)||!file.name)redirect('/church/import?error='+encodeURIComponent('Choose a CSV file.'))
  if(file.size>5*1024*1024)redirect('/church/import?error='+encodeURIComponent('CSV must be 5 MB or smaller.'))
  if(!file.name.toLowerCase().endsWith('.csv'))redirect('/church/import?error='+encodeURIComponent('Import files must use the .csv extension.'))
  let parsed:{headers:string[];records:CsvRecord[]}
  try{parsed=parseCsv(await file.text())}catch(e:any){redirect('/church/import?error='+encodeURIComponent(e.message||'Unable to parse CSV.'))}
  if(!parsed.records.length)redirect('/church/import?error='+encodeURIComponent('The CSV has no data rows.'))
  if(parsed.records.length>2500)redirect('/church/import?error='+encodeURIComponent('Import up to 2,500 rows per batch. Split larger files into multiple imports.'))
  const seen=new Set<string>()
  const staged=parsed.records.map((raw,index)=>{const row=canonicalize(dataset,raw);const error=validate(dataset,row,seen);return {row_number:index+2,row_data:row,row_status:error?'invalid':'ready',validation_error:error||null}})
  const ready=staged.filter(r=>r.row_status==='ready').length,invalid=staged.length-ready
  const {data:batch,error:batchError}=await supabase.from('church_import_batches').insert({church_id:churchId,uploaded_by:userId,dataset_type:dataset,filename:file.name,total_rows:staged.length,ready_rows:ready,invalid_rows:invalid}).select('id').single()
  if(batchError||!batch)redirect('/church/import?error='+encodeURIComponent(batchError?.message||'Unable to create import batch.'))
  for(let i=0;i<staged.length;i+=500){const chunk=staged.slice(i,i+500).map(r=>({...r,batch_id:batch.id}));const {error}=await supabase.from('church_import_rows').insert(chunk);if(error){await supabase.from('church_import_batches').delete().eq('id',batch.id);redirect('/church/import?error='+encodeURIComponent(error.message))}}
  revalidatePath('/church/import');redirect(`/church/import/${batch.id}`)
}

export async function processChurchImport(formData:FormData){
  const {supabase}=await admin();const batchId=text(formData,'batch_id')
  if(!batchId)redirect('/church/import')
  const {error}=await supabase.rpc('process_church_import_batch',{p_batch_id:batchId})
  if(error)redirect(`/church/import/${batchId}?error=`+encodeURIComponent(error.message))
  revalidatePath('/church/import');revalidatePath(`/church/import/${batchId}`);revalidatePath('/outreach');revalidatePath('/church/invites');redirect(`/church/import/${batchId}?processed=1`)
}

export async function deleteChurchImport(formData:FormData){
  const {supabase}=await admin();const batchId=text(formData,'batch_id')
  if(!batchId)redirect('/church/import')
  const {error}=await supabase.from('church_import_batches').delete().eq('id',batchId)
  if(error)redirect(`/church/import/${batchId}?error=`+encodeURIComponent(error.message))
  revalidatePath('/church/import');redirect('/church/import?deleted=1')
}
