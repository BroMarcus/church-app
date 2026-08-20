'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'form'
const supported=new Set(['text','textarea','email','phone','date','number','select','checkbox'])

async function manager(){
 const supabase=await createClient();const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub;if(!userId)redirect('/login')
 const {data:m}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single();if(!m?.church_id)redirect('/')
 const {data:permission}=await supabase.rpc('current_user_has_church_permission',{p_church_id:m.church_id,p_permission_key:'manage_members'})
 if(!['pastor','church_admin'].includes(m.role)&&!permission)redirect('/')
 return {supabase,userId,churchId:m.church_id}
}

function fields(raw:string){
 return raw.split('\n').map(line=>line.trim()).filter(Boolean).slice(0,40).map((line,index)=>{
  const parts=line.split('|').map(x=>x.trim()),label=parts[0]||`Field ${index+1}`,type=supported.has(parts[1])?parts[1]:'text',required=(parts[2]||'').toLowerCase()==='required',options=type==='select'?(parts[3]||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,20):[]
  return {key:`field_${index+1}_${slugify(label).slice(0,32)}`,label,type,required,options}
 })
}

export async function createWorkflowTemplate(formData:FormData){
 const {supabase,userId,churchId}=await manager(),name=text(formData,'name');if(!name)redirect('/church/forms?error=Workflow+name+is+required')
 const dueRaw=text(formData,'due_days'),dueDays=dueRaw===''?null:Math.max(0,Math.min(365,Number(dueRaw)||0))
 const {error}=await supabase.from('church_workflow_templates').insert({church_id:churchId,name,description:text(formData,'description')||null,default_status:text(formData,'default_status')||'new',default_next_action:text(formData,'default_next_action')||null,due_days:dueDays,created_by:userId})
 if(error){console.error('workflow template create failed',{churchId,message:error.message});redirect('/church/forms?error=Could+not+create+workflow')}
 revalidatePath('/church/forms');redirect('/church/forms?saved=Workflow+template+created')
}

export async function createChurchForm(formData:FormData){
 const {supabase,userId,churchId}=await manager(),title=text(formData,'title');if(!title)redirect('/church/forms?error=Form+title+is+required')
 const schema=fields(text(formData,'fields')),base=slugify(text(formData,'slug')||title);let slug=base
 const {data:existing}=await supabase.from('church_forms').select('id').eq('church_id',churchId).eq('slug',slug).maybeSingle();if(existing)slug=`${base}-${Date.now().toString().slice(-6)}`
 const workflowId=text(formData,'workflow_template_id')||null
 const {data:form,error}=await supabase.from('church_forms').insert({church_id:churchId,workflow_template_id:workflowId,title,slug,description:text(formData,'description')||null,form_schema:schema,published:false,created_by:userId}).select('id').single()
 if(error||!form){console.error('church form create failed',{churchId,message:error?.message});redirect('/church/forms?error=Could+not+create+form')}
 revalidatePath('/church/forms');redirect(`/church/forms?edit=${form.id}&saved=Draft+form+created`)
}

export async function updateChurchForm(formData:FormData){
 const {supabase,churchId}=await manager(),formId=text(formData,'form_id');const schema=fields(text(formData,'fields'))
 const {error}=await supabase.from('church_forms').update({title:text(formData,'title'),description:text(formData,'description')||null,workflow_template_id:text(formData,'workflow_template_id')||null,form_schema:schema,updated_at:new Date().toISOString()}).eq('id',formId).eq('church_id',churchId)
 if(error){console.error('church form update failed',{formId,message:error.message});redirect(`/church/forms?edit=${formId}&error=Could+not+save+form`)}
 revalidatePath('/church/forms');revalidatePath(`/forms/${formId}`);redirect(`/church/forms?edit=${formId}&saved=Form+saved`)
}

export async function setChurchFormState(formData:FormData){
 const {supabase,churchId}=await manager(),formId=text(formData,'form_id'),action=text(formData,'action')
 const patch=action==='archive'?{published:false,archived_at:new Date().toISOString()}:action==='restore'?{archived_at:null,published:false}:{published:action==='publish'}
 const {error}=await supabase.from('church_forms').update({...patch,updated_at:new Date().toISOString()}).eq('id',formId).eq('church_id',churchId)
 if(error){console.error('church form state failed',{formId,action,message:error.message});redirect('/church/forms?error=Could+not+change+form+status')}
 revalidatePath('/church/forms');revalidatePath('/forms');revalidatePath(`/forms/${formId}`);redirect('/church/forms?saved=Form+status+updated')
}
