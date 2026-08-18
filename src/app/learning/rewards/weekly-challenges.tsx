'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2,Gift,Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Challenge={challenge_id:string;title:string;title_es:string|null;description:string|null;description_es:string|null;challenge_type:string;progress_count:number;target_count:number;xp_reward:number;claimed:boolean}

export function WeeklyChallenges({challenges,lang}:{challenges:Challenge[];lang:'en'|'es'}){
  const router=useRouter()
  const [busy,setBusy]=useState<string|null>(null)
  const [message,setMessage]=useState<Record<string,string>>({})

  async function claim(challenge:Challenge){
    setBusy(challenge.challenge_id);setMessage(v=>({...v,[challenge.challenge_id]:''}))
    const supabase=createClient()
    const {data,error}=await supabase.rpc('claim_learning_challenge',{p_challenge_id:challenge.challenge_id})
    if(error){setMessage(v=>({...v,[challenge.challenge_id]:error.message}));setBusy(null);return}
    const row=Array.isArray(data)?data[0]:data
    if(row?.already_claimed)setMessage(v=>({...v,[challenge.challenge_id]:lang==='es'?'Ya reclamaste esta recompensa esta semana.':'You already claimed this reward this week.'}))
    else if(Number(row?.xp_awarded??0)>0)setMessage(v=>({...v,[challenge.challenge_id]:lang==='es'?`¡Completado! +${row.xp_awarded} XP`:`Completed! +${row.xp_awarded} XP`}))
    else setMessage(v=>({...v,[challenge.challenge_id]:lang==='es'?`Progreso: ${row?.progress_count??0}/${row?.target_count??challenge.target_count}`:`Progress: ${row?.progress_count??0}/${row?.target_count??challenge.target_count}`}))
    setBusy(null);router.refresh()
  }

  return <div className="challenge-grid">{challenges.map(ch=>{const progress=Math.min(100,Math.round((Number(ch.progress_count)/Math.max(1,Number(ch.target_count)))*100));const done=Number(ch.progress_count)>=Number(ch.target_count);const title=lang==='es'?(ch.title_es||ch.title):ch.title;const desc=lang==='es'?(ch.description_es||ch.description):ch.description;return <article className={`card challenge-card ${ch.claimed?'claimed':''}`} key={ch.challenge_id}><div className="challenge-top"><div className="challenge-icon">{ch.claimed?<CheckCircle2/>:<Target/>}</div><div><span>{lang==='es'?'DESAFÍO SEMANAL':'WEEKLY CHALLENGE'}</span><h3>{title}</h3></div><div className="challenge-reward"><Gift size={12}/> {ch.xp_reward} XP</div></div><p>{desc}</p><div className="challenge-progress"><span style={{width:`${progress}%`}}/></div><div className="challenge-count"><strong>{ch.progress_count}/{ch.target_count}</strong><span>{ch.claimed?(lang==='es'?'Recompensa reclamada':'Reward claimed'):done?(lang==='es'?'Listo para reclamar':'Ready to claim'):(lang==='es'?'En progreso':'In progress')}</span></div>{!ch.claimed&&<button className={done?'btn':'ghost'} disabled={busy===ch.challenge_id} onClick={()=>claim(ch)}>{busy===ch.challenge_id?(lang==='es'?'Verificando…':'Checking…'):done?(lang==='es'?'Reclamar XP':'Claim XP'):(lang==='es'?'Verificar progreso':'Check progress')}</button>}{message[ch.challenge_id]&&<div className="small muted" style={{marginTop:8}}>{message[ch.challenge_id]}</div>}</article>})}</div>
}
