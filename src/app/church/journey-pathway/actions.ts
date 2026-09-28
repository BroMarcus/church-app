'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const value=(form:FormData,key:string)=>String(form.get(key)??'').trim()
const langOf=(form:FormData)=>value(form,'lang')==='es'?'es':'en'
const route=(lang:string,pathwayId?:string)=>`/church/journey-pathway?lang=${lang}${pathwayId?`&pathway=${encodeURIComponent(pathwayId)}`:''}`

async function requireJourneyManager(churchId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('role').eq('church_id',churchId).eq('user_id',userId).eq('status','active').maybeSingle()
  if(!membership)redirect('/')
  const {data:custom}=await supabase.rpc('current_user_has_church_permission',{p_church_id:churchId,p_permission_key:'manage_members'})
  if(!['pastor','church_admin'].includes(membership.role)&&!custom)redirect('/')
  return {supabase,userId}
}

const presets={
  baptism:{title:'Baptism',source:'milestone_boolean',key:'baptized',completion:'true',href:'/profile'},
  holy_ghost:{title:'Holy Ghost',source:'milestone_boolean',key:'holy_ghost_received',completion:'true',href:'/help'},
  first_steps:{title:'First Steps',source:'milestone_status',key:'first_steps_status',completion:'completed',href:'/learning'},
  salt:{title:'SALT',source:'milestone_status',key:'salt_series_status',completion:'completed',href:'/learning'},
  soul_winning:{title:'Effective Soul Winning',source:'milestone_status',key:'soul_winning_status',completion:'completed',href:'/learning'},
  bible_study_teacher:{title:'Bible Study Teacher',source:'milestone_status',key:'bible_study_teacher_status',completion:'approved',href:'/learning'},
  timothys:{title:'Timothys',source:'milestone_status',key:'timothys_status',completion:'completed',href:'/learning'},
  school_pastors:{title:'School of Pastors',source:'milestone_status',key:'school_pastors_status',completion:'completed',href:'/learning'},
  friendship_group:{title:'Friendship Group',source:'friendship_group',key:null,completion:null,href:'/groups'},
  serving:{title:'Serving',source:'ministry_serving',key:null,completion:null,href:'/serve'},
  course:{title:'Course',source:'course',key:null,completion:null,href:'/learning'},
  manual:{title:'Custom step',source:'manual',key:null,completion:null,href:'/journey'}
} as const

export async function createPathway(formData:FormData){
  const churchId=value(formData,'church_id'),lang=langOf(formData),name=value(formData,'name'),description=value(formData,'description')||null
  if(!churchId||name.length<2||name.length>120)redirect(route(lang)+'&error='+encodeURIComponent(lang==='es'?'Escribe un nombre para el camino.':'Enter a pathway name.'))
  const {supabase,userId}=await requireJourneyManager(churchId)
  const {count}=await supabase.from('discipleship_pathways').select('id',{count:'exact',head:true}).eq('church_id',churchId).eq('active',true).eq('is_default',true)
  const {data,error}=await supabase.from('discipleship_pathways').insert({church_id:churchId,name,description,active:true,is_default:(count??0)===0,created_by:userId}).select('id').single()
  if(error)redirect(route(lang)+'&error='+encodeURIComponent(error.message))
  revalidatePath('/journey');revalidatePath('/church/journey-pathway');revalidatePath('/church')
  redirect(route(lang,data.id)+'&saved=pathway')
}

export async function setDefaultPathway(formData:FormData){
  const churchId=value(formData,'church_id'),pathwayId=value(formData,'pathway_id'),lang=langOf(formData)
  if(!churchId||!pathwayId)redirect(route(lang)+'&error='+encodeURIComponent('Missing pathway.'))
  const {supabase}=await requireJourneyManager(churchId)
  const {data:target}=await supabase.from('discipleship_pathways').select('id').eq('id',pathwayId).eq('church_id',churchId).eq('active',true).maybeSingle()
  if(!target)redirect(route(lang)+'&error='+encodeURIComponent(lang==='es'?'Camino no encontrado.':'Pathway not found.'))
  const {error:clearError}=await supabase.from('discipleship_pathways').update({is_default:false,updated_at:new Date().toISOString()}).eq('church_id',churchId).eq('is_default',true)
  if(clearError)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(clearError.message))
  const {error}=await supabase.from('discipleship_pathways').update({is_default:true,updated_at:new Date().toISOString()}).eq('id',pathwayId).eq('church_id',churchId)
  if(error)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(error.message))
  revalidatePath('/journey');revalidatePath('/church/journey-pathway')
  redirect(route(lang,pathwayId)+'&saved=default')
}

export async function addPathwayStep(formData:FormData){
  const churchId=value(formData,'church_id'),pathwayId=value(formData,'pathway_id'),lang=langOf(formData),presetKey=value(formData,'preset') as keyof typeof presets
  const preset=presets[presetKey]
  if(!churchId||!pathwayId||!preset)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(lang==='es'?'Paso inválido.':'Invalid pathway step.'))
  const {supabase}=await requireJourneyManager(churchId)
  const {data:path}=await supabase.from('discipleship_pathways').select('id').eq('id',pathwayId).eq('church_id',churchId).eq('active',true).maybeSingle()
  if(!path)redirect(route(lang)+'&error='+encodeURIComponent(lang==='es'?'Camino no encontrado.':'Pathway not found.'))

  let title=preset.title,completionKey:string|null=preset.key,completionValue:string|null=preset.completion,href:string=preset.href
  if(presetKey==='course'){
    const courseId=value(formData,'course_id')
    const {data:course}=await supabase.from('courses').select('id,title').eq('id',courseId).eq('church_id',churchId).maybeSingle()
    if(!course)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(lang==='es'?'Selecciona un curso válido.':'Choose a valid course.'))
    title=course.title;completionKey=course.id
  }else if(presetKey==='manual'){
    title=value(formData,'custom_title')
    href=value(formData,'custom_href')||'/journey'
    if(title.length<2||title.length>120||!href.startsWith('/')||href.startsWith('//'))redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(lang==='es'?'Completa el paso personalizado.':'Complete the custom step.'))
  }
  const description=value(formData,'description')||null
  const {data:last}=await supabase.from('discipleship_pathway_steps').select('sort_order').eq('church_id',churchId).eq('pathway_id',pathwayId).eq('active',true).order('sort_order',{ascending:false}).limit(1).maybeSingle()
  const payload={
    church_id:churchId,pathway_id:pathwayId,step_key:`${presetKey}_${randomUUID().slice(0,8)}`,title,description,
    completion_source:preset.source,completion_key:completionKey,completion_value:completionValue,suggested_href:href,
    sort_order:Number(last?.sort_order??0)+10,required:value(formData,'required')!=='no',active:true
  }
  const {error}=await supabase.from('discipleship_pathway_steps').insert(payload)
  if(error)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(error.message))
  revalidatePath('/journey');revalidatePath('/church/journey-pathway');revalidatePath('/church/leadership')
  redirect(route(lang,pathwayId)+'&saved=step')
}

export async function movePathwayStep(formData:FormData){
  const churchId=value(formData,'church_id'),pathwayId=value(formData,'pathway_id'),stepId=value(formData,'step_id'),direction=value(formData,'direction'),lang=langOf(formData)
  if(!churchId||!pathwayId||!stepId||!['up','down'].includes(direction))redirect(route(lang,pathwayId))
  const {supabase}=await requireJourneyManager(churchId)
  const {data:steps,error}=await supabase.from('discipleship_pathway_steps').select('id,sort_order').eq('church_id',churchId).eq('pathway_id',pathwayId).eq('active',true).order('sort_order').order('id')
  if(error)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(error.message))
  const index=(steps??[]).findIndex(step=>step.id===stepId),otherIndex=direction==='up'?index-1:index+1
  if(index<0||otherIndex<0||otherIndex>=(steps??[]).length)redirect(route(lang,pathwayId))
  const current=steps![index],other=steps![otherIndex],stamp=Date.now()
  const {error:first}=await supabase.from('discipleship_pathway_steps').update({sort_order:other.sort_order,updated_at:new Date(stamp).toISOString()}).eq('id',current.id).eq('church_id',churchId)
  if(first)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(first.message))
  const {error:second}=await supabase.from('discipleship_pathway_steps').update({sort_order:current.sort_order,updated_at:new Date(stamp+1).toISOString()}).eq('id',other.id).eq('church_id',churchId)
  if(second)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(second.message))
  revalidatePath('/journey');revalidatePath('/church/journey-pathway')
  redirect(route(lang,pathwayId))
}

export async function archivePathwayStep(formData:FormData){
  const churchId=value(formData,'church_id'),pathwayId=value(formData,'pathway_id'),stepId=value(formData,'step_id'),lang=langOf(formData)
  if(!churchId||!pathwayId||!stepId)redirect(route(lang,pathwayId))
  const {supabase}=await requireJourneyManager(churchId)
  const {error}=await supabase.from('discipleship_pathway_steps').update({active:false,updated_at:new Date().toISOString()}).eq('id',stepId).eq('pathway_id',pathwayId).eq('church_id',churchId)
  if(error)redirect(route(lang,pathwayId)+'&error='+encodeURIComponent(error.message))
  revalidatePath('/journey');revalidatePath('/church/journey-pathway');revalidatePath('/church/leadership')
  redirect(route(lang,pathwayId)+'&saved=archived')
}
