import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle,CheckCircle2,ClipboardCheck,FileQuestion } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AssessmentUpgradeQueue(){
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims();const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const {data:membership}=await supabase.from('church_memberships').select('church_id,role,churches(name)').eq('user_id',userId).eq('status','active').limit(1).single()
  if(!membership?.church_id)redirect('/learning')
  const {data:customAccess}=await supabase.rpc('current_user_has_church_permission',{p_church_id:membership.church_id,p_permission_key:'manage_learning'})
  if(!['minister','pastor','church_admin'].includes(membership.role)&&!customAccess)redirect('/learning')
  const church:any=Array.isArray(membership.churches)?membership.churches[0]:membership.churches
  const {data:rows,error}=await supabase.from('assessment_standard_audit').select('*').eq('church_id',membership.church_id).eq('meets_standard',false).order('published',{ascending:false}).order('course_title').order('title')
  const items=rows??[],published=items.filter((r:any)=>r.published),drafts=items.filter((r:any)=>!r.published)
  return <main className="shell">
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{church?.name??'Your Church'} • Assessment Upgrades</div></div><div className="row"><Link className="ghost" href="/learning/manage">← Curriculum Manager</Link><Link className="ghost" href="/learning">Learning</Link></div></header>
    <section className="card" style={{padding:24,marginBottom:18}}><div className="pill">ASSESSMENT QUALITY</div><h1>Tests that still need to meet the new standard.</h1><p className="muted">Checkpoint tests require 5–10 questions. Final exams require 20–25. Existing published legacy tests remain available while curriculum leadership upgrades them deliberately.</p><div className="row" style={{gap:12,flexWrap:'wrap',marginTop:14}}><div className="card" style={{padding:14,minWidth:170}}><strong style={{fontSize:28}}>{published.length}</strong><div className="small muted">published legacy tests</div></div><div className="card" style={{padding:14,minWidth:170}}><strong style={{fontSize:28}}>{drafts.length}</strong><div className="small muted">draft tests to finish</div></div></div></section>
    {error&&<div className="notice error">{error.message}</div>}
    {published.length>0&&<section style={{marginBottom:24}}><div className="row" style={{gap:9,alignItems:'center',marginBottom:10}}><AlertTriangle size={18}/><h2 style={{margin:0}}>Published legacy assessments</h2></div><div style={{display:'grid',gap:12}}>{published.map((r:any)=><UpgradeCard key={r.id} row={r}/>)}</div></section>}
    {drafts.length>0&&<section style={{marginBottom:24}}><div className="row" style={{gap:9,alignItems:'center',marginBottom:10}}><FileQuestion size={18}/><h2 style={{margin:0}}>Draft assessments</h2></div><div style={{display:'grid',gap:12}}>{drafts.map((r:any)=><UpgradeCard key={r.id} row={r}/>)}</div></section>}
    {!items.length&&<section className="card" style={{padding:24,textAlign:'center'}}><CheckCircle2 size={32}/><h2>All assessments meet the standard.</h2><p className="muted">Every checkpoint and final in this church is within the required question range.</p></section>}
  </main>
}

function UpgradeCard({row}:{row:any}){
  const isFinal=row.assessment_type==='final_exam'
  const target=isFinal?'20–25':'5–10'
  const missing=row.question_count<row.min_questions?row.min_questions-row.question_count:0
  const extra=row.question_count>row.max_questions?row.question_count-row.max_questions:0
  return <article className="card" style={{padding:18}}><div className="row" style={{justifyContent:'space-between',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}><div><div className="row" style={{gap:6,flexWrap:'wrap'}}><span className="pill">{isFinal?'FINAL EXAM':'CHECKPOINT'}</span>{row.published&&<span className="pill">PUBLISHED LEGACY</span>}</div><h3 style={{margin:'8px 0 3px'}}>{row.title}</h3><div className="small muted">{row.course_title}</div></div><div style={{textAlign:'right'}}><strong style={{fontSize:24}}>{row.question_count}</strong><div className="small muted">questions • target {target}</div></div></div><div className="notice" style={{margin:'12px 0 0'}}><ClipboardCheck size={14}/> {missing?`Add at least ${missing} more question${missing===1?'':'s'}.`:extra?`Reduce by at least ${extra} question${extra===1?'':'s'} to reach the 20–25 / 5–10 standard.`:'Review this assessment.'}</div><div className="row" style={{marginTop:12,gap:8,flexWrap:'wrap'}}><Link className="btn" href={`/learning/manage#course-${row.course_id}`}>Open in Curriculum Manager</Link><Link className="ghost" href={`/learning/${row.course_id}`}>Preview course</Link></div></article>
}
