import { ClipboardCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { saveBibleStudyPracticum } from './practicum-actions'

const areas=[
  ['preparation','Preparation'],['scripture_navigation','Scripture navigation'],['biblical_accuracy','Biblical accuracy'],['clarity','Clarity'],['listening','Listening'],['stays_on_topic','Stays on topic'],['humility_respect','Humility & respect'],['checks_understanding','Checks understanding'],['follow_up_readiness','Follow-up readiness']
] as const
const labels:Record<string,string>={needs_practice:'Needs practice',partner_ready:'Ready with a partner',independent_ready:'Ready independently',approved:'Approved'}

export async function BibleStudyPracticum({userId,churchId}:{userId:string;churchId:string}){
  const supabase=await createClient()
  const {data:rows}=await supabase.from('bible_study_practicums').select('id,study_lesson,language_code,practiced_at,score_percent,recommendation,notes,evaluator_user_id,profiles:evaluator_user_id(display_name,first_name,last_name)').eq('church_id',churchId).eq('trainee_user_id',userId).order('practiced_at',{ascending:false}).limit(10)
  return <section className="card record-section" style={{marginBottom:16}}>
    <div className="record-section-head"><div><ClipboardCheck/><div><h2>Bible Study Teacher Practicum</h2><p>Observe a practice study and document readiness before independent teaching.</p></div></div><span className="verified-label">1–5 SCORE</span></div>
    <form action={saveBibleStudyPracticum} className="record-form">
      <input type="hidden" name="church_id" value={churchId}/><input type="hidden" name="trainee_user_id" value={userId}/>
      <div className="record-grid"><label className="record-field"><span>Study / lesson practiced</span><input name="study_lesson" placeholder="e.g. Lesson 2 — Repentance"/></label><label className="record-field"><span>Language</span><select name="language_code" defaultValue="en"><option value="en">English</option><option value="es">Español</option></select></label></div>
      <div className="record-grid">{areas.map(([name,label])=><label className="record-field" key={name}><span>{label}</span><select name={name} defaultValue="3" required><option value="1">1 — Needs major coaching</option><option value="2">2 — Developing</option><option value="3">3 — Competent</option><option value="4">4 — Strong</option><option value="5">5 — Excellent</option></select></label>)}</div>
      <div className="record-grid"><label className="record-field"><span>Recommendation</span><select name="recommendation" defaultValue="needs_practice"><option value="needs_practice">Needs practice</option><option value="partner_ready">Ready with a partner</option><option value="independent_ready">Ready independently</option><option value="approved">Approved Bible Study Teacher</option></select></label><label className="record-field"><span>Coaching notes</span><input name="notes" placeholder="Strengths, corrections, next practice goal…"/></label></div>
      <div><button className="btn" type="submit">Save practicum scorecard</button></div>
    </form>
    <div style={{marginTop:18}}><div className="pill">PRACTICUM HISTORY</div>{(rows??[]).length?<div style={{display:'grid',gap:8,marginTop:10}}>{(rows??[]).map((r:any)=>{const p=Array.isArray(r.profiles)?r.profiles[0]:r.profiles;const evaluator=p?.display_name||[p?.first_name,p?.last_name].filter(Boolean).join(' ')||'Leadership';return <div className="card" style={{padding:12}} key={r.id}><div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>{r.study_lesson||'Practice Bible study'}</strong><strong>{Math.round(Number(r.score_percent))}% • {labels[r.recommendation]??r.recommendation}</strong></div><div className="small muted" style={{marginTop:4}}>{new Date(r.practiced_at).toLocaleDateString()} • {r.language_code==='es'?'Español':'English'} • Evaluated by {evaluator}</div>{r.notes&&<p style={{margin:'7px 0 0'}}>{r.notes}</p>}</div>})}</div>:<p className="small muted" style={{marginTop:10}}>No practicum scorecards yet.</p>}</div>
  </section>
}
