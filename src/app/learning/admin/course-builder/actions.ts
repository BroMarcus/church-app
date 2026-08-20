'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'course'

async function learningManager(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:customLearningAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!customLearningAccess)redirect('/learning')
  return {supabase,userId,churchId:membership.church_id}
}

export async function createBuilderCourse(formData:FormData){
  const language=text(formData,'lang')==='es'?'es':'en'
  const {supabase,userId,churchId}=await learningManager()
  const title=text(formData,'title')
  if(!title)redirect(`/learning/admin/course-builder?${language==='es'?'lang=es&':''}error=${encodeURIComponent(language==='es'?'Escribe un título para la clase.':'Enter a class title.')}`)
  const base=slugify(text(formData,'slug')||title)
  let slug=base
  const {data:existing}=await supabase.from('courses').select('id').eq('church_id',churchId).eq('slug',slug).maybeSingle()
  if(existing)slug=`${base}-${Date.now().toString().slice(-6)}`
  const audience=['new_convert','member','teacher_training','leadership','general'].includes(text(formData,'audience_level'))?text(formData,'audience_level'):'general'
  const stage=['new_convert','foundation','outreach','teaching','leadership','specialized'].includes(text(formData,'pathway_stage'))?text(formData,'pathway_stage'):'foundation'
  const {data:course,error}=await supabase.from('courses').insert({
    church_id:churchId,
    title:title.slice(0,180),
    slug,
    description:text(formData,'description')||null,
    category:text(formData,'category')||'discipleship',
    passing_score:Math.max(80,Math.min(100,Number(formData.get('passing_score')||80))),
    badge_name:text(formData,'badge_name')||null,
    published:false,
    created_by:userId,
    language_code:text(formData,'language_code')==='es'?'es':'en',
    audience_level:audience,
    pathway_stage:stage,
    pathway_order:Math.max(0,Number(formData.get('pathway_order')||100)),
    curriculum_version:text(formData,'curriculum_version')||'1.0'
  }).select('id').single()
  if(error||!course){
    console.error('class builder create course failed',{churchId,message:error?.message})
    redirect(`/learning/admin/course-builder?${language==='es'?'lang=es&':''}error=${encodeURIComponent(language==='es'?'No pudimos crear la clase. Nada fue publicado.':'We could not create the class. Nothing was published.')}`)
  }
  redirect(`/learning/admin/course-builder/${course.id}${language==='es'?'?lang=es':''}`)
}
