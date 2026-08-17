'use client'

import { useMemo,useState } from 'react'
import { Gamepad2,RotateCcw,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Question={id:string;position:number;prompt:string;options:any[]}
type Game={id:string;title:string;description:string;language_code:string;xp_reward:number;questions:Question[]}

export function GameCard({game}:{game:Game}){
  const [answers,setAnswers]=useState<Record<string,string>>({})
  const [busy,setBusy]=useState(false)
  const [result,setResult]=useState<{score:number;max_score:number;percentage:number;xp_awarded:number}|null>(null)
  const [error,setError]=useState('')
  const start=useMemo(()=>Date.now(),[])
  const allAnswered=game.questions.every(q=>Boolean(answers[q.id]))

  async function submit(){
    setBusy(true);setError('')
    const supabase=createClient()
    const duration=Math.max(1,Math.round((Date.now()-start)/1000))
    const {data,error}=await supabase.rpc('submit_learning_game',{p_game_id:game.id,p_answers:answers,p_duration_seconds:duration})
    if(error){setError(error.message);setBusy(false);return}
    const row=Array.isArray(data)?data[0]:data
    if(row)setResult({score:Number(row.score),max_score:Number(row.max_score),percentage:Number(row.percentage),xp_awarded:Number(row.xp_awarded)})
    setBusy(false)
  }

  function reset(){setAnswers({});setResult(null);setError('')}

  return <article className="card game-card"><div className="game-head"><div><div className="pill"><Gamepad2 size={12}/> {game.language_code==='es'?'JUEGO':'GAME'}</div><h3>{game.title}</h3><p>{game.description}</p></div><span className="xp-chip">+{game.xp_reward} XP</span></div>
    {!result&&<div className="game-questions">{game.questions.map(q=><fieldset key={q.id} className="game-question"><legend>{q.position}. {q.prompt}</legend>{(q.options??[]).map((o:any)=><label className="game-option" key={String(o.value)}><input type="radio" name={q.id} checked={answers[q.id]===String(o.value)} onChange={()=>setAnswers(v=>({...v,[q.id]:String(o.value)}))}/><span>{String(o.label)}</span></label>)}</fieldset>)}</div>}
    {result&&<div className={`game-result ${result.percentage>=80?'great':''}`}><Trophy/><div><strong>{result.score}/{result.max_score} • {Math.round(result.percentage)}%</strong><span>{result.xp_awarded>0?`+${result.xp_awarded} XP earned today`:'Daily XP already earned — replay for practice anytime.'}</span></div></div>}
    {!result?<button className="btn" onClick={submit} disabled={busy||!allAnswered}>{busy?'Scoring…':game.language_code==='es'?'Terminar juego':'Finish game'}</button>:<button className="ghost" onClick={reset}><RotateCcw size={13}/> {game.language_code==='es'?'Jugar otra vez':'Play again'}</button>}
    {error&&<div className="notice error" style={{marginTop:10}}>{error}</div>}
  </article>
}
