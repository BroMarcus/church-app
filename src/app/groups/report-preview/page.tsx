import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ReportParityHelper} from '../[groupId]/report-parity-helper'
import '../groups.css'

const previewBranch='workstream/friendship-group-report-hardening'

export default function FriendshipReportPreview(){
 if(process.env.VERCEL_GIT_COMMIT_REF!==previewBranch)notFound()
 const roster=['Ana Rivera','Daniel Ortiz','Maria Santos']
 return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Friendship Groups • Review preview</div></div><Link className="ghost" href="/">Home</Link></header>
  <section className="group-detail-hero card"><div><div className="pill">PR #43 • READ-ONLY REVIEW</div><h1>2025 Friendship Group Report</h1><p className="muted">This isolated page shows the report changes without using church records or allowing a submission.</p></div><div className="leader-badge">Preview only</div></section>
  <section className="card group-section group-report"><div className="pill">LEADER REPORT / REPORTE DEL LÍDER</div><h2>Mobile paper-report parity</h2><p className="small muted">Automatic attendance and first-visit totals, five guest rows, bilingual paper-form labels, and local phone draft recovery.</p>
   <form data-friendship-report><input type="hidden" name="group_id" value="preview"/><div className="report-grid"><label className="field"><span>Meeting date / Fecha</span><input type="date" name="meeting_date" defaultValue="2026-08-21"/></label><label className="field"><span>Meeting type / Tipo</span><select defaultValue="regular"><option value="regular">Regular group / Grupo regular</option><option value="matthew_party">Matthew party</option><option value="picnic">Picnic</option><option value="barbecue">Barbecue / Parrillada</option><option value="special_event">Special event / Evento especial</option></select></label></div>
    <section className="card" style={{padding:14,margin:'14px 0',background:'rgba(255,255,255,.03)'}}><div className="pill">MEMBER ATTENDANCE / ASISTENCIA</div><div style={{display:'grid',gap:8,marginTop:10}}>{roster.map((name,index)=><label className="row" style={{justifyContent:'space-between',gap:10}} key={name}><strong>{name}</strong><select name={`attendance_status_preview_${index}`} defaultValue={index<2?'on_time':'missing'}><option value="on_time">Present / Presente</option><option value="late">Present (late) / Presente (tarde)</option><option value="missing">Missing / Ausente</option></select></label>)}</div></section>
    <ReportParityHelper groupId="review-preview" meetingDate="2026-08-21"/>
    <details className="card" style={{padding:14,margin:'14px 0'}} open><summary style={{fontWeight:800,cursor:'pointer'}}>Guest list / Lista de visitas</summary>{[1,2,3,4,5].map(n=><div className="report-grid" key={n} style={{marginTop:10}}><label className="field"><span>Guest / Visita {n}</span><input name={`guest_${n}_first_name`} placeholder="First name / Nombre"/></label><label className="field"><span>Last name / Apellido</span><input name={`guest_${n}_last_name`}/></label><label className="field"><span>Visit / Visita</span><select name={`guest_${n}_visit`} defaultValue=""><option value="">—</option><option value="1">1st / 1ra</option><option value="2">2nd / 2da</option><option value="3">3rd / 3ra</option><option value="g">FG guest / Visita GA</option></select></label><label className="field"><span>Phone / Teléfono</span><input type="tel"/></label></div>)}</details>
    <div className="report-grid"><label className="field"><span>Active Bible studies / Estudios bíblicos activos</span><input type="number" min="0" defaultValue="0"/></label><label className="field"><span>Baptisms / Bautismos</span><input type="number" min="0" defaultValue="0"/></label><label className="field"><span>Holy Ghost / Espíritu Santo</span><input type="number" min="0" defaultValue="0"/></label></div>
    <label className="field"><span>Urgent matters / Asuntos urgentes</span><textarea rows={3}/></label><label className="field"><span>Group leader comments / Comentario del líder</span><textarea rows={3}/></label>
    <button className="btn" type="button" disabled>Preview only — no data will be submitted</button>
   </form>
  </section>
 </main>
}
