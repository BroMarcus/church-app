import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Award,Flame,Gamepad2,Sparkles,Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BadgeSeal } from '@/components/badge-seal'
import { GameCard } from './game-card'
import { WeeklyChallenges } from './weekly-challenges'
import './rewards.css'

export default async function RewardsPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const supabase=await createClient()
  const {data:claims}=await supabase.auth.getClaims()
  const userId=claims?.claims?.sub
  if(!userId)redirect('/login')
  const [{data:levels},{data:xpEvents},{data:games},{data:memberBadges},{data:challenges},{data:streakRows}]=await Promise.all([
    supabase.from('learning_levels').select('*').order('level_number'),
    supabase.from('learning_xp_events').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
    supabase.from('learning_games').select('*').eq('published',true).eq('language_code',lang).order('created_at'),
    supabase.from('member_badges').select('earned_at,badges(name,description,category,icon_key,badge_kind,visual_tier,display_order)').eq('user_id',userId).order('earned_at',{ascending:false}),
    supabase.rpc('get_my_learning_challenges'),
    supabase.rpc('get_my_learning_streak')
  ])
  const gameIds=(games??[]).map((g:any)=>g.id)
  let questions:any[]=[]
  if(gameIds.length){const r=await supabase.from('learning_game_questions').select('id,game_id,position,prompt,options').in('game_id',gameIds).order('position');questions=r.data??[]}
  const qBy=new Map<string,any[]>();for(const q of questions){const list=qBy.get(q.game_id)??[];list.push(q);qBy.set(q.game_id,list)}
  const gameRows=(games??[]).map((g:any)=>({...g,questions:qBy.get(g.id)??[]}))

  const xp=(xpEvents??[]).reduce((sum:number,e:any)=>sum+Number(e.points??0),0)
  const levelRows=levels??[]
  const current=[...levelRows].reverse().find((l:any)=>xp>=l.min_xp)??levelRows[0]
  const next=levelRows.find((l:any)=>l.min_xp>xp)
  const progress=next&&current?Math.max(0,Math.min(100,Math.round(((xp-current.min_xp)/(next.min_xp-current.min_xp))*100))):100
  const official=(memberBadges??[]).filter((r:any)=>{const b=Array.isArray(r.badges)?r.badges[0]:r.badges;return b&&b.badge_kind!=='learning_trophy'})
  const learning=(memberBadges??[]).filter((r:any)=>{const b=Array.isArray(r.badges)?r.badges[0]:r.badges;return b&&b.badge_kind==='learning_trophy'})
  const streak:any=Array.isArray(streakRows)?streakRows[0]:streakRows

  return <main className="shell"><header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">Learning Rewards</div></div><div className="row"><Link className="ghost" href={`/learning/rewards?lang=${lang==='en'?'es':'en'}`}>{lang==='en'?'Español':'English'}</Link><Link className="ghost" href={`/learning?lang=${lang}`}>← Learning</Link></div></header>
    <section className="card rewards-hero"><div><div className="pill">LEARNING REWARDS</div><h1>{lang==='es'?'Aprende. Practica. Crece.':'Learn. Practice. Grow.'}</h1><p className="muted">{lang==='es'?'Los niveles y trofeos celebran el estudio y la comprensión. No son una clasificación espiritual.':'Levels and trophies celebrate study and understanding. They are not a spiritual ranking.'}</p></div><div className="level-card"><span>{lang==='es'?'NIVEL ACTUAL':'CURRENT LEVEL'}</span><strong>{current?.name??'Starting Point'}</strong><div className="level-progress"><span style={{width:`${progress}%`}}/></div><div className="xp-total">{xp} XP {next?`• ${next.min_xp-xp} XP to ${next.name}`:'• Highest current level'}</div></div></section>

    <section className="reward-grid"><div className="card reward-stat"><Sparkles/><strong>{xp}</strong><span>Learning XP</span></div><div className="card reward-stat"><Flame/><strong>{Number(streak?.current_streak??0)}</strong><span>{lang==='es'?'días de racha':'day study streak'} • best {Number(streak?.longest_streak??0)}</span></div><div className="card reward-stat"><Award/><strong>{official.length}</strong><span>Verified credentials</span></div><div className="card reward-stat"><Trophy/><strong>{learning.length}</strong><span>Learning trophies</span></div></section>

    <section className="reward-section"><div className="pill">WEEKLY CHALLENGES</div><h2>{lang==='es'?'Metas pequeñas. Progreso constante.':'Small goals. Consistent progress.'}</h2><p className="muted">{lang==='es'?`Has estudiado ${Number(streak?.active_days_this_week??0)} día(s) esta semana. Los desafíos recompensan solamente actividades de aprendizaje verificadas.`:`You have studied on ${Number(streak?.active_days_this_week??0)} day(s) this week. Challenges reward verified learning activity only.`}</p><WeeklyChallenges challenges={(challenges??[]) as any[]} lang={lang}/></section>

    <section className="reward-section"><div className="pill"><Trophy size={12}/> TROPHY CASE</div><h2>{lang==='es'?'Trofeos de aprendizaje':'Learning trophies'}</h2><p className="muted">{lang==='es'?'Estos trofeos celebran estudio, práctica y comprensión; no representan rango espiritual.':'These trophies celebrate study, practice and understanding; they do not represent spiritual rank.'}</p><div className="badge-showcase">{learning.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} key={`${b.name}-${row.earned_at}`}/>:null})}{!learning.length&&<div className="card empty"><h3>Your first trophy is waiting.</h3><p className="muted">Complete a lesson, pass a quiz or earn a perfect game score to unlock one.</p></div>}</div></section>

    <section className="reward-section"><div className="pill"><Award size={12}/> VERIFIED CREDENTIALS</div><h2>{lang==='es'?'Credenciales verificadas':'Verified credentials'}</h2><p className="muted">{lang==='es'?'Estas credenciales provienen de registros y aprobaciones verificadas por el liderazgo.':'These credentials come from leadership-verified records and approved qualifications.'}</p><div className="badge-showcase">{official.map((row:any)=>{const b=Array.isArray(row.badges)?row.badges[0]:row.badges;return b?<BadgeSeal badge={b} earnedAt={row.earned_at} key={`${b.name}-${row.earned_at}`}/>:null})}{!official.length&&<div className="card empty"><h3>No verified credentials yet.</h3><p className="muted">Approved discipleship, training and ministry qualifications will appear here.</p></div>}</div></section>

    <section className="reward-section"><div className="pill"><Gamepad2 size={12}/> {lang==='es'?'JUEGOS DE APRENDIZAJE':'LEARNING GAMES'}</div><h2>{lang==='es'?'Practica jugando':'Practice by playing'}</h2><p className="muted">{lang==='es'?'Los juegos dan una pequeña recompensa diaria de XP y se pueden repetir para practicar.':'Games give a small daily XP reward and can be replayed anytime for practice.'}</p><div className="game-grid">{gameRows.map((g:any)=><GameCard game={g} key={g.id}/>)}{!gameRows.length&&<div className="card empty"><h3>No games yet.</h3><p className="muted">Course-specific games will appear here as curriculum is added.</p></div>}</div></section>

    <section className="reward-section"><div className="pill">LEVEL PATH</div><h2>{lang==='es'?'Tu nivel de aprendizaje':'Your learning level'}</h2><div className="level-list">{levelRows.map((l:any)=><div className={`level-item ${l.level_number===current?.level_number?'current':''}`} key={l.level_number}><strong>Level {l.level_number} • {l.name}</strong><span>{l.min_xp} XP • {l.description}</span></div>)}</div></section>

    <section className="reward-section"><div className="pill">RECENT ACTIVITY</div><h2>{lang==='es'?'Historial de XP':'XP history'}</h2><div className="card" style={{padding:16}}><div className="activity-list">{(xpEvents??[]).slice(0,15).map((e:any)=><div className="activity-row" key={e.id}><div><strong>{e.description||e.event_type.replaceAll('_',' ')}</strong><span style={{display:'block'}}>{new Date(e.created_at).toLocaleString()}</span></div><strong>+{e.points} XP</strong></div>)}{!xpEvents?.length&&<div className="small muted">Complete lessons, assessments and games to begin earning learning XP.</div>}</div></div></section>
  </main>
}
