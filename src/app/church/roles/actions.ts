'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const permissionKeys=['view_leadership','manage_outreach','manage_groups','lead_own_group','manage_learning','manage_calendar','manage_ministries','manage_teams','manage_members','manage_media','request_finance','view_finance','manage_finance','approve_finance'] as const
const financePermissionKeys=['view_finance','manage_finance','approve_finance'] as const
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)
const error=(message:string)=>redirect('/church/roles?error='+encodeURIComponent(message))
const hasFinancePermissions=(value:any)=>financePermissionKeys.some(k=>Boolean(value?.[k]))

async function admin(){
 const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login')
 const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
 if(!membership?.church_id||!['pastor','church_admin'].includes(membership.role))redirect('/')
 return{supabase,userId,churchId:membership.church_id,actorRole:membership.role}
}
const permissions=(f:FormData)=>Object.fromEntries(permissionKeys.map(k=>[k,text(f,k)==='on']))
const done=(key:string)=>{revalidatePath('/church/roles');revalidatePath('/church');redirect(`/church/roles?${key}=1`)}

export async function createRole(formData:FormData){
 const {supabase,userId,churchId,actorRole}=await admin();const name=text(formData,'name');if(!name)error('Role name is required')
 const slug=slugify(name);if(!slug)error('Invalid role name')
 const nextPermissions=permissions(formData)
 if(actorRole!=='pastor'&&hasFinancePermissions(nextPermissions))error('Only a Pastor can create a role with finance access')
 const {error:dbError}=await supabase.from('church_roles').insert({church_id:churchId,name,slug,description:text(formData,'description')||null,permissions:nextPermissions,created_by:userId})
 if(dbError)error(dbError.message);done('created')
}

export async function updateRole(formData:FormData){
 const {supabase,churchId,actorRole}=await admin();const id=text(formData,'role_id'),name=text(formData,'name');if(!id||!name)error('Invalid role')
 const {data:existing}=await supabase.from('church_roles').select('id,permissions').eq('id',id).eq('church_id',churchId).maybeSingle()
 if(!existing){redirect('/church/roles?error='+encodeURIComponent('Role not found'))}
 const nextPermissions=permissions(formData)
 if(actorRole!=='pastor'&&(hasFinancePermissions(existing.permissions)||hasFinancePermissions(nextPermissions)))error('Only a Pastor can change a finance-capable role')
 const {error:dbError}=await supabase.from('church_roles').update({name,description:text(formData,'description')||null,permissions:nextPermissions,active:text(formData,'active')==='on',updated_at:new Date().toISOString()}).eq('id',id).eq('church_id',churchId)
 if(dbError)error(dbError.message);done('saved')
}

export async function assignRole(formData:FormData){
 const {supabase,userId,churchId,actorRole}=await admin();const roleId=text(formData,'role_id'),memberId=text(formData,'user_id');if(!roleId||!memberId)error('Choose a role and member')
 const {data:member}=await supabase.from('church_memberships').select('user_id').eq('church_id',churchId).eq('user_id',memberId).eq('status','active').maybeSingle();if(!member)error('Member must be active')
 const {data:role}=await supabase.from('church_roles').select('id,permissions').eq('id',roleId).eq('church_id',churchId).eq('active',true).maybeSingle()
 if(!role){redirect('/church/roles?error='+encodeURIComponent('Role not available'))}
 if(actorRole!=='pastor'&&hasFinancePermissions(role.permissions))error('Only a Pastor can assign finance access')
 const {error:dbError}=await supabase.from('church_role_assignments').upsert({church_id:churchId,role_id:roleId,user_id:memberId,assigned_by:userId},{onConflict:'church_id,role_id,user_id'})
 if(dbError)error(dbError.message);done('assigned')
}

export async function removeRoleAssignment(formData:FormData){
 const {supabase,churchId,actorRole}=await admin();const id=text(formData,'assignment_id');if(!id)error('Invalid assignment')
 const {data:assignment}=await supabase.from('church_role_assignments').select('id,role_id').eq('id',id).eq('church_id',churchId).maybeSingle()
 if(!assignment){redirect('/church/roles?error='+encodeURIComponent('Assignment not found'))}
 const {data:role}=await supabase.from('church_roles').select('permissions').eq('id',assignment.role_id).eq('church_id',churchId).maybeSingle()
 if(actorRole!=='pastor'&&hasFinancePermissions(role?.permissions))error('Only a Pastor can remove finance access')
 const {error:dbError}=await supabase.from('church_role_assignments').delete().eq('id',id).eq('church_id',churchId);if(dbError)error(dbError.message);done('removed')
}
