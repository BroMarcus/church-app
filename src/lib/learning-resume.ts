export type LearningResumeKind='lesson'|'final'|'complete'

export type LearningResumeState={
  kind:LearningResumeKind
  href:string
  courseId:string
  courseTitle:string
  moduleId?:string
  moduleTitle?:string
  assessmentId?:string
  assessmentTitle?:string
}

const effectivePassing=(coursePassing:number,assessmentPassing?:number|null)=>Math.max(coursePassing,Number(assessmentPassing??80))

export async function getLearningResumeState(supabase:any,userId:string,course:any):Promise<LearningResumeState>{
  const courseId=String(course.id)
  const courseTitle=String(course.title??'Course')
  const coursePassing=Math.max(0,Math.min(100,Number(course.passing_score??80)))
  const [{data:modules},{data:progress},{data:assessments}]=await Promise.all([
    supabase.from('course_modules').select('id,title,position').eq('course_id',courseId).order('position'),
    supabase.from('course_module_progress').select('module_id,completed').eq('course_id',courseId).eq('user_id',userId),
    supabase.from('course_assessments').select('id,title,assessment_type,passing_score,module_id,required,published').eq('course_id',courseId).eq('published',true).order('created_at')
  ])

  const assessmentRows=assessments??[]
  const assessmentIds=assessmentRows.map((a:any)=>a.id)
  let attempts:any[]=[]
  if(assessmentIds.length){
    const result=await supabase.from('assessment_attempts').select('assessment_id,percentage').eq('user_id',userId).in('assessment_id',assessmentIds)
    attempts=result.data??[]
  }

  const attemptsBy=new Map<string,number[]>()
  for(const row of attempts){
    const list=attemptsBy.get(row.assessment_id)??[]
    list.push(Number(row.percentage??0))
    attemptsBy.set(row.assessment_id,list)
  }
  const passedAssessment=(assessment:any)=>{
    const threshold=effectivePassing(coursePassing,assessment.passing_score)
    return (attemptsBy.get(assessment.id)??[]).some(score=>score>=threshold)
  }

  const completedModules=new Set((progress??[]).filter((p:any)=>p.completed).map((p:any)=>p.module_id))
  const requiredByModule=new Map<string,any[]>()
  for(const assessment of assessmentRows){
    if(!assessment.module_id||!assessment.required)continue
    const list=requiredByModule.get(assessment.module_id)??[]
    list.push(assessment)
    requiredByModule.set(assessment.module_id,list)
  }

  for(const courseModule of modules??[]){
    const required=requiredByModule.get(courseModule.id)??[]
    const done=required.length?required.every(passedAssessment):completedModules.has(courseModule.id)
    if(!done){
      return {kind:'lesson',href:`/learning/${courseId}/lesson/${courseModule.id}`,courseId,courseTitle,moduleId:courseModule.id,moduleTitle:courseModule.title}
    }
  }

  const final=assessmentRows.find((a:any)=>a.required&&a.assessment_type==='final_exam')??assessmentRows.find((a:any)=>a.assessment_type==='final_exam')
  if(final&&!passedAssessment(final)){
    return {kind:'final',href:`/learning/${courseId}#course-final`,courseId,courseTitle,assessmentId:final.id,assessmentTitle:final.title}
  }

  return {kind:'complete',href:`/learning/${courseId}`,courseId,courseTitle}
}
