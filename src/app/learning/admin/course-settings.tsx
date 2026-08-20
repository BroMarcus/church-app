import { Settings2 } from 'lucide-react'
import { createCourse,updateCourseSettings } from './actions'

const audiences=[['general','General'],['new_convert','New Convert'],['member','Member'],['teacher_training','Teacher Training'],['leadership','Leadership']] as const
const stages=[['new_convert','1 • New Convert'],['foundation','2 • Foundation'],['outreach','3 • Outreach'],['teaching','4 • Teaching'],['leadership','5 • Leadership'],['specialized','Specialized']] as const

function SharedFields({course}:{course?:any}){return <>
  <label><span>Language</span><select name="language_code" defaultValue={course?.language_code??'en'}><option value="en">English</option><option value="es">Español</option></select></label>
  <label><span>Audience</span><select name="audience_level" defaultValue={course?.audience_level??'general'}>{audiences.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  <label><span>Pathway stage</span><select name="pathway_stage" defaultValue={course?.pathway_stage??'foundation'}>{stages.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></label>
  <label><span>Pathway order</span><input name="pathway_order" type="number" min="0" defaultValue={course?.pathway_order??100}/></label>
  <label><span>Category</span><input name="category" defaultValue={course?.category??''} placeholder="discipleship"/></label>
  <label><span>Estimated minutes</span><input name="estimated_minutes" type="number" min="0" defaultValue={course?.estimated_minutes??''}/></label>
  <label><span>Course minimum passing score</span><input name="passing_score" type="number" min="0" max="100" defaultValue={course?.passing_score??80}/><small className="muted">Required assessments use at least this score. An individual test may be stricter.</small></label>
  <label><span>Credential / badge</span><input name="badge_name" defaultValue={course?.badge_name??''} placeholder="Faith Messenger"/></label>
  <label><span>Curriculum version</span><input name="curriculum_version" defaultValue={course?.curriculum_version??'1.0'} placeholder="1.0"/></label>
  <label><span>Translation pair key</span><input name="translation_key" defaultValue={course?.translation_key??''} placeholder="effective-soul-winning"/><small className="muted">Use the same key on English and Spanish versions.</small></label>
  <label className="wide"><span>Source revision</span><input name="source_revision" defaultValue={course?.source_revision??''} placeholder="2026 approved revision, legacy binder, official source…"/></label>
  <label className="wide"><span>Description</span><textarea name="description" rows={3} defaultValue={course?.description??''} placeholder="What this course equips the member to do."/></label>
</>}

export function NewCourseForm(){return <form action={createCourse} className="studio-grid"><label className="wide"><span>Course title</span><input name="title" required placeholder="Effective Soul Winning"/></label><SharedFields/><button className="btn wide">Create course draft</button></form>}

export function CourseSettings({course}:{course:any}){return <details className="course-settings"><summary><Settings2 size={13}/> Course settings</summary><form action={updateCourseSettings} className="studio-grid"><input type="hidden" name="course_id" value={course.id}/><label className="wide"><span>Course title</span><input name="title" required defaultValue={course.title}/></label><SharedFields course={course}/><button className="ghost wide">Save course settings</button></form></details>}
