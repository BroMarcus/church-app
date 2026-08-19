'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const permissionKeys=['view_leadership','manage_outreach','manage_groups','manage_learning','manage_calendar','manage_ministries','manage_teams','manage_members','manage_media'] as const
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)

async function admin(){
 const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login')
 const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
 if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
 return{supabase,userId,churchId:membership.church_id}
}
const permissions=(f:FormData)=>Object.fromEntries(permissionKeys.map(k=>[k,text(f,k)==='on']))
const done=(key:string)=>{revalidatePath('/church/roles');revalidatePath('/church');redirect(`/church/roles?${key}=1`)}

export async function createRole(formData:FormData){
 const {supabase,userId,churchId}=await admin();const name=text(formData,'name');if(!name)redirect('/church/roles?error=Role%20name%20is%20required')
 const slug=slugify(name);if(!slug)redirect('/church/roles?error=Invalid%20role%20name')
 const {error}=await supabase.from('church_roles').insert({church_id:churchId,name,slug,description:text(formData,'description')||null,permissions:permissions(formData),created_by:userId})
 if(error)redirect('/church/roles?error='+encodeURIComponent(error.message));done('created')
}

export async function updateRole(formData:FormData){
 const {supabase,churchId}=await admin();const id=text(formData,'role_id'),name=text(formData,'name');if(!id||!name)redirect('/church/roles?error=Invalid%20role')
 const {error}=await supabase.from('church_roles').update({name,description:text(formData,'description')||null,permissions:permissions(formData),active:text(formData,'active')==='on',updated_at:new Date().toISOString()}).eq('id',id).eq('church_id',churchId)
 if(error)redirect('/church/roles?error='+encodeURIComponent(error.message));done('saved')
}

export async function assignRole(formData:FormData){
 const {supabase,userId,churchId}=await admin();const roleId=text(formData,'role_id'),memberId=text(formData,'user_id');if(!roleId||!memberId)redirect('/church/roles?error=Choose%20a%20role%20and%20member')
 const {data:member}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',memberId).eq('status','active').maybeSingle();if(!member)redirect('/church/roles?error=Member%20must%20be%20active')
 const {data:role}=await supabase.from('church_roles').select('id').eq('id',roleId).eq('church_id',churchId).eq('active',true).maybeSingle();if(!role)redirect('/church/roles?error=Role%20not%20available')
 const {error}=await supabase.from('church_role_assignments').upsert({church_id:churchId,role_id:roleId,user_id:memberId,assigned_by:userId},{onConflict:'church_id,role_id,user_id'})
 if(error)redirect('/church/roles?error='+encodeURIComponent(error.message));done('assigned')
}

export async function removeRoleAssignment(formData:FormData){
 const {supabase,churchId}=await admin();const id=text(formData,'assignment_id');if(!id)redirect('/church/roles?error=Invalid%20assignment')
 const {error}=await supabase.from('church_role_assignments').delete().eq('id',id).eq('church_id',churchId);if(error)redirect('/church/roles?error='+encodeURIComponent(error.message));done('removed')
}
