'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}
async function localToUtc(supabase:any,churchId:string,value:string){if(!value)return null;const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value});if(error)throw new Error(error.message);return data as string|null}

export async function createAssignment(formData:FormData){
  const {supabase,userId}=await auth();const churchId=text(formData,'church_id'),assigned=text(formData,'assigned_user_id'),title=text(formData,'title'),starts=text(formData,'starts_at'),call=text(formData,'call_time')
  if(!churchId||!assigned||!title||!starts)redirect('/teams?error='+encodeURIComponent('Person, assignment and start time are required.'))
  let startsUtc:string|null=null,callUtc:string|null=null
  try{startsUtc=await localToUtc(supabase,churchId,starts);callUtc=await localToUtc(supabase,churchId,call)}catch(e:any){redirect('/teams?error='+encodeURIComponent(e.message||'Invalid team schedule time.'))}
  if(!startsUtc)redirect('/teams?error='+encodeURIComponent('Start time is required.'))
  if(callUtc&&new Date(callUtc).getTime()>new Date(startsUtc).getTime())redirect('/teams?error='+encodeURIComponent('Call time must be before or equal to the assignment start time.'))
  const {error}=await supabase.from('team_assignments').insert({church_id:churchId,ministry_id:text(formData,'ministry_id')||null,assigned_user_id:assigned,created_by:userId,title,starts_at:startsUtc,call_time:callUtc,confirmation_required:true,notes:text(formData,'notes')||null})
  if(error)redirect('/teams?error='+encodeURIComponent(error.message))
  revalidatePath('/teams');redirect('/teams?created=1')
}

export async function respondToAssignment(formData:FormData){
  const {supabase,userId}=await auth();const assignmentId=text(formData,'assignment_id'),response=text(formData,'response')
  if(!['confirmed','declined'].includes(response))redirect('/teams?error='+encodeURIComponent('Invalid response.'))
  const {error}=await supabase.from('team_assignment_responses').upsert({assignment_id:assignmentId,user_id:userId,response,note:text(formData,'note')||null,responded_at:new Date().toISOString()},{onConflict:'assignment_id,user_id'})
  if(error)redirect('/teams?error='+encodeURIComponent(error.message))
  revalidatePath('/teams');redirect('/teams?responded=1')
}
