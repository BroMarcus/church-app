'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { qualification } from './qualification'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const checked=(f:FormData,k:string)=>['on','true','1','yes'].includes(text(f,k).toLowerCase())
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function createMinistry(formData:FormData){
  const {supabase,userId}=await auth();const churchId=text(formData,'church_id'),name=text(formData,'name')
  const {data:actor}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').single()
  if(!actor||!['ministry_leader','pastor','church_admin'].includes(actor.role))redirect('/serve')
  if(!name)redirect('/serve?error='+encodeURIComponent('Ministry name is required.'))
  const openings=text(formData,'openings')?Math.max(0,Number.parseInt(text(formData,'openings'),10)||0):null
  const {error}=await supabase.from('ministries').insert({church_id:churchId,name,description:text(formData,'description')||null,openings,active:checked(formData,'active')})
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');revalidatePath('/church/readiness');redirect('/serve?created=1')
}

export async function updateMinistry(formData:FormData){
  const {supabase}=await auth();const ministryId=text(formData,'ministry_id'),name=text(formData,'name')
  if(!ministryId||!name)redirect('/serve?error='+encodeURIComponent('Ministry name is required.'))
  const openings=text(formData,'openings')?Math.max(0,Number.parseInt(text(formData,'openings'),10)||0):null
  const {error}=await supabase.from('ministries').update({name,description:text(formData,'description')||null,openings,active:checked(formData,'active')}).eq('id',ministryId)
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');revalidatePath('/church/readiness');redirect('/serve?updated=1')
}

export async function addRequirement(formData:FormData){
  const {supabase}=await auth();const ministryId=text(formData,'ministry_id')
  const payload={ministry_id:ministryId,requirement_type:text(formData,'requirement_type'),requirement_key:text(formData,'requirement_key')||null,label:text(formData,'label'),required:true,weight:1}
  const {error}=await supabase.from('ministry_requirements').insert(payload)
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');redirect('/serve?requirement=1')
}

export async function removeRequirement(formData:FormData){
  const {supabase}=await auth();const requirementId=text(formData,'requirement_id')
  if(!requirementId)redirect('/serve?error='+encodeURIComponent('Requirement not found.'))
  const {error}=await supabase.from('ministry_requirements').delete().eq('id',requirementId)
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');redirect('/serve?requirement_removed=1')
}

export async function applyToMinistry(formData:FormData){
  const {supabase,userId}=await auth();const ministryId=text(formData,'ministry_id')
  const {data:ministry}=await supabase.from('ministries').select('church_id,active').eq('id',ministryId).single()
  if(!ministry?.active)redirect('/serve?error='+encodeURIComponent('This ministry is not currently open for applications.'))
  const [{data:requirements},{data:milestones},{data:membership}]=await Promise.all([
    supabase.from('ministry_requirements').select('*').eq('ministry_id',ministryId),
    supabase.from('member_milestones').select('*').eq('church_id',ministry.church_id).eq('user_id',userId).maybeSingle(),
    supabase.from('church_memberships').select('status').eq('church_id',ministry.church_id).eq('user_id',userId).maybeSingle()
  ])
  const q=qualification((requirements??[]) as any[],milestones,membership?.status==='active')
  const {error}=await supabase.from('ministry_applications').insert({ministry_id:ministryId,user_id:userId,status:q.qualified?'qualified':'submitted',qualification_score:q.score,message:text(formData,'message')||null})
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');redirect('/serve?applied=1')
}

export async function reviewApplication(formData:FormData){
  const {supabase,userId}=await auth();const id=text(formData,'application_id'),status=text(formData,'status')
  if(!['qualified','interview','accepted','declined'].includes(status))redirect('/serve?error='+encodeURIComponent('Invalid application status.'))
  const {error}=await supabase.from('ministry_applications').update({status,review_note:text(formData,'review_note')||null,reviewed_by:userId,reviewed_at:new Date().toISOString()}).eq('id',id)
  if(error)redirect('/serve?error='+encodeURIComponent(error.message))
  revalidatePath('/serve');redirect('/serve?reviewed=1')
}
