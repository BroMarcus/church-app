'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const types=['camp','convention','missions','building','emergency','youth','general']
const statuses=['draft','active','completed','cancelled']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const money=(f:FormData,k:string)=>{const n=Number(text(f,k));return Number.isFinite(n)?Math.max(0,Math.round(n*100)/100):0}
const langOf=(f:FormData)=>text(f,'lang')==='es'?'es':'en'
const fundUrl=(lang:string,extra='')=>`/fundraising?lang=${lang}${extra}`
const userError=(lang:string,es:string,en:string)=>fundUrl(lang,'&error='+encodeURIComponent(lang==='es'?es:en))

async function auth(lang='en'){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect(`/login?lang=${lang}`);return{supabase,userId}}
async function localToUtc(supabase:any,churchId:string,value:string){if(!value)return null;const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value});if(error)throw new Error('INVALID_CHURCH_TIME');return data as string|null}

export async function createCampaign(formData:FormData){
  const lang=langOf(formData),{supabase,userId}=await auth(lang)
  const churchId=text(formData,'church_id'),title=text(formData,'title'),description=text(formData,'description'),type=text(formData,'campaign_type'),status=text(formData,'status')||'draft',goal=money(formData,'goal_amount')
  if(!churchId||!title||goal<=0||!types.includes(type)||!statuses.includes(status))redirect(userError(lang,'Se requieren título, tipo y una meta mayor de $0.','Campaign title, type and a goal greater than $0 are required.'))
  let startsAt:string|null=null,endsAt:string|null=null
  try{startsAt=await localToUtc(supabase,churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,churchId,text(formData,'ends_at'))}catch{redirect(userError(lang,'Revisa las fechas y horas de la campaña.','Check the campaign dates and times.'))}
  if(startsAt&&endsAt&&new Date(endsAt).getTime()<new Date(startsAt).getTime())redirect(userError(lang,'La fecha final debe ser después del inicio.','Campaign end must be after the start.'))
  const {error}=await supabase.from('fundraising_campaigns').insert({church_id:churchId,created_by:userId,title,description:description||null,campaign_type:type,goal_amount:goal,raised_amount:0,status,featured:text(formData,'featured')==='on',starts_at:startsAt,ends_at:endsAt})
  if(error){console.error('createCampaign failed',{code:error.code,message:error.message});redirect(userError(lang,'No pudimos crear la campaña. Revisa tu acceso e inténtalo otra vez.','We could not create the campaign. Check your access and try again.'))}
  revalidatePath('/fundraising');redirect(fundUrl(lang,'&created=1'))
}

export async function updateCampaign(formData:FormData){
  const lang=langOf(formData),{supabase}=await auth(lang)
  const id=text(formData,'campaign_id'),status=text(formData,'status'),raised=money(formData,'raised_amount')
  if(!id||!statuses.includes(status))redirect(userError(lang,'Actualización de campaña inválida.','Invalid campaign update.'))
  const {error}=await supabase.from('fundraising_campaigns').update({raised_amount:raised,status,featured:text(formData,'featured')==='on'}).eq('id',id)
  if(error){console.error('updateCampaign failed',{code:error.code,message:error.message});redirect(userError(lang,'No pudimos guardar la campaña. Revisa tu acceso e inténtalo otra vez.','We could not save the campaign. Check your access and try again.'))}
  revalidatePath('/fundraising');redirect(fundUrl(lang,'&saved=1'))
}
