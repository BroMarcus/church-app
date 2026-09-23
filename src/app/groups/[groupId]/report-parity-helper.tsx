'use client'

import {useEffect,useMemo,useState} from 'react'

export function ReportParityHelper({groupId,meetingDate}:{groupId:string;meetingDate:string}){
 const [extra,setExtra]=useState({children:0,churchMembers:0,otherGroupMembers:0})
 const [present,setPresent]=useState(0),[firstTime,setFirstTime]=useState(0),[restored,setRestored]=useState(false)
 const total=useMemo(()=>present+extra.children+extra.churchMembers+extra.otherGroupMembers,[extra,present])
 useEffect(()=>{
  const form=document.querySelector<HTMLFormElement>('form[data-friendship-report]');if(!form)return
  const key=`kn:friendship-report:${groupId}:${meetingDate}`
  const calculate=()=>{setPresent([...form.querySelectorAll<HTMLSelectElement>('select[name^="attendance_status_"]')].filter(field=>field.value!=='missing').length);setFirstTime([...form.querySelectorAll<HTMLSelectElement>('select[name$="_visit"]')].filter(field=>field.value==='1').length)}
  const save=()=>localStorage.setItem(key,JSON.stringify({fields:Object.fromEntries(new FormData(form).entries()),extra,updatedAt:new Date().toISOString()}))
  try{const raw=localStorage.getItem(key);if(raw){const draft=JSON.parse(raw);if(draft.extra)setExtra(draft.extra);setRestored(true)}}catch{}
  calculate();form.addEventListener('change',calculate);const timer=window.setInterval(save,3000)
  return()=>{form.removeEventListener('change',calculate);window.clearInterval(timer);save()}
 },[extra,groupId,meetingDate])
 return <section className="card" style={{padding:14,margin:'14px 0',background:'rgba(255,255,255,.03)'}}><div className="pill">PAPER REPORT TOTALS / TOTALES DEL INFORME</div>{restored&&<div className="notice" role="status">Saved phone draft found / Borrador del teléfono encontrado</div>}<p className="small muted">Roster selections plus the paper-form categories calculate attendance automatically. Guest visit selections calculate first-time guests.</p><div className="report-grid">{([['children','C — Children / Niños'],['churchMembers','M — Church member, not in FG / Miembro de iglesia, no de GA'],['otherGroupMembers','A/O — Member of another group / Miembro de otro grupo']] as const).map(([key,label])=><label className="field" key={key}><span>{label}</span><input type="number" min="0" inputMode="numeric" value={extra[key]} onChange={event=>setExtra(current=>({...current,[key]:Math.max(0,Number(event.target.value)||0)}))}/></label>)}</div><input type="hidden" name="attendance_count" value={total}/><input type="hidden" name="first_time_guests" value={firstTime}/><div className="notice"><strong>Attendance / Asistencia: {total}</strong> • First-time guests / Visitas de primera vez: {firstTime}</div></section>
}
