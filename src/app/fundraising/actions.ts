'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const types=['camp','convention','missions','building','emergency','youth','general']
const statuses=['draft','active','completed','cancelled']
const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const money=(f:FormData,k:string)=>{const n=Number(text(f,k));return Number.isFinite(n)?Math.max(0,Math.round(n*100)/100):0}

async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

async function localToUtc(supabase:any,churchId:string,value:string){if(!value)return null;const {data,error}=await supabase.rpc('church_local_datetime_to_utc',{p_church_id:churchId,p_local_datetime:value});if(error)throw new Error(error.message);return data as string|null}

export async function createCampaign(formData:FormData){
  const {supabase,userId}=await auth()
  const churchId=text(formData,'church_id'),title=text(formData,'title'),description=text(formData,'description'),type=text(formData,'campaign_type'),status=text(formData,'status')||'draft',goal=money(formData,'goal_amount')
  if(!churchId||!title||goal<=0||!types.includes(type)||!statuses.includes(status))redirect('/fundraising?error='+encodeURIComponent('Campaign title, type and a goal greater than $0 are required.'))
  let startsAt:string|null=null,endsAt:string|null=null
  try{startsAt=await localToUtc(supabase,churchId,text(formData,'starts_at'));endsAt=await localToUtc(supabase,churchId,text(formData,'ends_at'))}catch(e:any){redirect('/fundraising?error='+encodeURIComponent(e.message||'Invalid campaign date.'))}
  if(startsAt&&endsAt&&new Date(endsAt).getTime()<new Date(startsAt).getTime())redirect('/fundraising?error='+encodeURIComponent('Campaign end must be after the start.'))
  const {error}=await supabase.from('fundraising_campaigns').insert({church_id:churchId,created_by:userId,title,description:description||null,campaign_type:type,goal_amount:goal,raised_amount:0,status,featured:text(formData,'featured')==='on',starts_at:startsAt,ends_at:endsAt})
  if(error)redirect('/fundraising?error='+encodeURIComponent(error.message))
  revalidatePath('/fundraising');redirect('/fundraising?created=1')
}

export async function updateCampaign(formData:FormData){
  const {supabase}=await auth()
  const id=text(formData,'campaign_id'),status=text(formData,'status'),raised=money(formData,'raised_amount')
  if(!id||!statuses.includes(status))redirect('/fundraising?error='+encodeURIComponent('Invalid campaign update.'))
  const {error}=await supabase.from('fundraising_campaigns').update({raised_amount:raised,status,featured:text(formData,'featured')==='on'}).eq('id',id)
  if(error)redirect('/fundraising?error='+encodeURIComponent(error.message))
  revalidatePath('/fundraising');redirect('/fundraising?saved=1')
}
