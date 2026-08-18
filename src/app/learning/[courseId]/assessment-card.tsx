'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2,ClipboardCheck,XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Question={id:string;position:number;question_type:string;prompt:string;options:any;points:number}
type Assessment={id:string;title:string;assessment_type:string;passing_score:number;max_attempts:number|null;questions:Question[];attempts:{attempt_number:number;percentage:number;passed:boolean;submitted_at:string|null}[]}

const opts=(raw:any)=>Array.isArray(raw)?raw.map((o:any,i:number)=>typeof o==='string'?{value:o,label:o}:{value:String(o?.value??o?.id??i),label:String(o?.label??o?.text??o?.value??`Option ${i+1}`)}):[]

export function AssessmentCard({assessment,courseId}:{assessment:Assessment;courseId:string}){
  const router=useRouter()
  const [answers,setAnswers]=useState<Record<string,any>>({})
  const [saving,setSaving]=useState(false)
  const [result,setResult]=useState<{percentage:number;passed:boolean;attempt_number:number}|null>(null)
  const [error,setError]=useState('')
  const attempts=assessment.attempts??[]
  const maxed=assessment.max_attempts!=null&&attempts.length>=assessment.max_attempts

  const setSingle=(id:string,value:string)=>setAnswers(v=>({...v,[id]:value}))
  const toggleMulti=(id:string,value:string,checked:boolean)=>setAnswers(v=>{const current=Array.isArray(v[id])?v[id]:[];const next=checked?[...new Set([...current,value])]:current.filter((x:string)=>x!==value);return {...v,[id]:next.sort()}})

  async function submit(){
    setSaving(true);setError('')
    const supabase=createClient()
    const {data,error}=await supabase.rpc('submit_assessment_attempt',{p_assessment_id:assessment.id,p_answers:answers})
    if(error){setError(error.message);setSaving(false);return}
    const row=Array.isArray(data)?data[0]:data
    const refresh=await supabase.rpc('refresh_my_course_completion',{p_course_id:courseId})
    if(refresh.error){setError(refresh.error.message);setSaving(false);return}
    setResult(row?{percentage:Number(row.percentage),passed:Boolean(row.passed),attempt_number:Number(row.attempt_number)}:null)
    setSaving(false);router.refresh()
  }

  return <article className="card assessment-card"><div className="assessment-head"><div><div className="pill">{assessment.assessment_type.replaceAll('_',' ')}</div><h3>{assessment.title}</h3><p className="small muted">Pass with {assessment.passing_score}%{assessment.max_attempts?` • ${assessment.max_attempts} attempt${assessment.max_attempts===1?'':'s'} max`:' • unlimited attempts'}</p></div><ClipboardCheck/></div>
    {attempts.length>0&&<div className="attempt-history">{attempts.map(a=><span className={a.passed?'attempt-pass':'attempt-fail'} key={a.attempt_number}>Attempt {a.attempt_number}: {Number(a.percentage)}% {a.passed?'Passed':'Not passed'}</span>)}</div>}
    {!result&&!maxed&&<div className="questions">{assessment.questions.map(q=><fieldset className="question" key={q.id}><legend><span>{q.position}.</span> {q.prompt}</legend>{q.question_type==='true_false'?['True','False'].map(v=><label className="answer-option" key={v}><input type="radio" name={q.id} checked={answers[q.id]===v.toLowerCase()} onChange={()=>setSingle(q.id,v.toLowerCase())}/><span>{v}</span></label>):q.question_type==='multi_select'?opts(q.options).map(o=><label className="answer-option" key={o.value}><input type="checkbox" checked={Array.isArray(answers[q.id])&&answers[q.id].includes(o.value)} onChange={e=>toggleMulti(q.id,o.value,e.target.checked)}/><span>{o.label}</span></label>):opts(q.options).map(o=><label className="answer-option" key={o.value}><input type="radio" name={q.id} checked={answers[q.id]===o.value} onChange={()=>setSingle(q.id,o.value)}/><span>{o.label}</span></label>)}</fieldset>)}</div>}
    {maxed&&!result&&<div className="assessment-result fail"><XCircle/><div><strong>Maximum attempts reached</strong><span>Church leadership can review your score history and decide the next step.</span></div></div>}
    {result&&<div className={`assessment-result ${result.passed?'pass':'fail'}`}>{result.passed?<CheckCircle2/>:<XCircle/>}<div><strong>{result.passed?'Passed':'Keep learning'} • {result.percentage}%</strong><span>Attempt {result.attempt_number}. {result.passed?'Great work — this assessment is complete.':'Review the lesson and try again if another attempt is available.'}</span></div></div>}
    {!result&&!maxed&&<button className="btn" disabled={saving||assessment.questions.length===0} onClick={submit}>{saving?'Scoring…':'Submit assessment'}</button>}
    {error&&<div className="notice error" style={{marginTop:10}}>{error}</div>}
  </article>
}
