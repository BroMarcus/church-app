'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const text=(f:FormData,k:string)=>String(f.get(k)??'').trim()
async function auth(){const supabase=await createClient();const {data}=await supabase.auth.getClaims();const userId=data?.claims?.sub;if(!userId)redirect('/login');return{supabase,userId}}

export async function startCourse(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id')
  const {error}=await supabase.from('course_enrollments').upsert({course_id:courseId,user_id:userId,progress:0,credential_earned:false,updated_at:new Date().toISOString()},{onConflict:'course_id,user_id',ignoreDuplicates:true})
  if(error)redirect('/learning?error='+encodeURIComponent(error.message))
  revalidatePath('/learning');redirect(`/learning/${courseId}`)
}

export async function setModuleComplete(formData:FormData){
  const {supabase,userId}=await auth();const courseId=text(formData,'course_id'),moduleId=text(formData,'module_id'),complete=text(formData,'complete')==='1';const now=new Date().toISOString()
  const {error}=await supabase.from('course_module_progress').upsert({user_id:userId,course_id:courseId,module_id:moduleId,completed:complete,completed_at:complete?now:null,updated_at:now},{onConflict:'user_id,module_id'})
  if(error)redirect(`/learning/${courseId}?error=`+encodeURIComponent(error.message))
  const {error:refreshError}=await supabase.rpc('refresh_my_course_completion',{p_course_id:courseId})
  if(refreshError)redirect(`/learning/${courseId}?error=`+encodeURIComponent(refreshError.message))
  revalidatePath(`/learning/${courseId}`);revalidatePath('/learning');redirect(`/learning/${courseId}?saved=1`)
}
