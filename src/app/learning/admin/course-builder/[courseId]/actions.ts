'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()

async function manager(courseId:string){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id||!['minister','pastor','church_admin'].includes(membership.role))redirect('/learning')
  const {data:course}=await supabase.from('courses').select('id').eq('id',courseId).eq('church_id',membership.church_id).single()
  if(!course)redirect('/learning/admin')
  return {supabase,userId,churchId:membership.church_id}
}

export async function addBuilderLesson(formData:FormData){
  const courseId=text(formData,'course_id'),title=text(formData,'title')
  if(!courseId||!title)return
  const {supabase}=await manager(courseId)
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  await supabase.from('course_modules').insert({course_id:courseId,position:(last?.position??0)+1,title,content:{summary:text(formData,'summary'),body:text(formData,'body')}})
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function createLessonShells(formData:FormData){
  const courseId=text(formData,'course_id')
  const raw=text(formData,'lesson_titles')
  if(!courseId||!raw)return
  const {supabase}=await manager(courseId)
  const titles=raw.split('\n').map(v=>v.trim()).filter(Boolean).slice(0,40)
  if(!titles.length)return
  const {data:last}=await supabase.from('course_modules').select('position').eq('course_id',courseId).order('position',{ascending:false}).limit(1).maybeSingle()
  const start=(last?.position??0)+1
  await supabase.from('course_modules').insert(titles.map((title,i)=>({course_id:courseId,position:start+i,title,content:{summary:'Draft lesson shell — review source material and add teaching content before publishing.',body:''}})))
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function createCourseAssessmentShell(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,userId}=await manager(courseId)
  const title=text(formData,'title')||'Course Final Review'
  await supabase.from('course_assessments').insert({course_id:courseId,title,assessment_type:'final_exam',passing_score:Math.max(0,Math.min(100,Number(formData.get('passing_score')||80))),required:true,published:false,created_by:userId})
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
}

export async function saveBuilderCourse(formData:FormData){
  const courseId=text(formData,'course_id')
  if(!courseId)return
  const {supabase,churchId}=await manager(courseId)
  await supabase.from('courses').update({title:text(formData,'title'),description:text(formData,'description')||null,badge_name:text(formData,'badge_name')||null,passing_score:Math.max(0,Math.min(100,Number(formData.get('passing_score')||80))),language_code:text(formData,'language_code')==='es'?'es':'en'}).eq('id',courseId).eq('church_id',churchId)
  revalidatePath(`/learning/admin/course-builder/${courseId}`)
  revalidatePath('/learning/admin')
}
