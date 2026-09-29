'use client'

import {useEffect,useRef,useState} from 'react'
import {CheckCircle2,Clock3} from 'lucide-react'
import {createClient} from '@/lib/supabase/client'

type Progress={active_seconds:number;required_seconds:number;completed:boolean;module_complete:boolean}

export function ResourceEngagement({
  courseId,moduleId,resourceIndex,lang='en'
}:{courseId:string;moduleId:string;resourceIndex:number;lang?:'en'|'es'}){
  const es=lang==='es',t=(en:string,sp:string)=>es?sp:en
  const [progress,setProgress]=useState<Progress|null>(null)
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  const activeRef=useRef(true)
  const busyRef=useRef(false)
  const completedRef=useRef(false)

  useEffect(()=>{
    activeRef.current=true
    let timer:number|undefined
    const supabase=createClient()
    const record=async(delta:number)=>{
      if(!activeRef.current||busyRef.current||completedRef.current&&delta>0)return
      busyRef.current=true
      setBusy(true)
      const {data,error}=await supabase.rpc('record_course_resource_engagement',{
        p_course_id:courseId,
        p_module_id:moduleId,
        p_resource_index:resourceIndex,
        p_active_seconds:delta,
      })
      if(!activeRef.current)return
      if(error){setError(error.message);busyRef.current=false;setBusy(false);return}
      const next=data as Progress
      completedRef.current=Boolean(next?.completed)
      setError('')
      setProgress(next)
      busyRef.current=false
      setBusy(false)
    }
    void record(0)
    timer=window.setInterval(()=>{
      if(document.visibilityState==='visible'&&document.hasFocus()&&!completedRef.current)void record(10)
    },10000)
    return()=>{activeRef.current=false;if(timer)window.clearInterval(timer)}
  },[courseId,moduleId,resourceIndex])

  const required=Math.max(0,Number(progress?.required_seconds||0))
  const active=Math.max(0,Number(progress?.active_seconds||0))
  const remaining=Math.max(0,required-active)
  const pct=required?Math.min(100,Math.round((active/required)*100)):0

  return <section className="card" style={{padding:14,marginBottom:14}}>
    <div className="row" style={{justifyContent:'space-between',gap:10,alignItems:'center',flexWrap:'wrap'}}>
      <div>
        <div className="pill">{progress?.completed?<CheckCircle2 size={12}/>:<Clock3 size={12}/>} {t('READING PROGRESS','PROGRESO DE LECTURA')}</div>
        <div style={{marginTop:7,fontWeight:700}}>{progress?.completed?t('Material complete','Material completado'):t('One Kingdom is tracking active reading time','One Kingdom está registrando el tiempo de lectura activa')}</div>
        <div className="small muted" style={{marginTop:3}}>{progress?.completed
          ?progress.module_complete?t('This lesson was completed automatically.','Esta lección se completó automáticamente.'):t('This material is complete. Return to the lesson when ready.','Este material está completo. Regresa a la lección cuando estés listo.')
          :remaining>0?t(`About ${remaining} active second${remaining===1?'':'s'} remaining.`,`Aproximadamente ${remaining} segundo${remaining===1?'':'s'} activos restantes.`):t('Verifying completion…','Verificando finalización…')}</div>
      </div>
      {!progress?.completed&&<span className="small muted">{busy?t('Saving progress…','Guardando progreso…'):t('Timer pauses if this tab is hidden.','El tiempo se pausa si esta pestaña está oculta.')}</span>}
    </div>
    <div className="progress-track" style={{marginTop:10}}><div className="progress-fill" style={{width:`${pct}%`}}/></div>
    {error&&<div className="notice error" style={{marginTop:10}}>{error}</div>}
  </section>
}
