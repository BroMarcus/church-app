'use client'

import { useMemo,useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic,MicOff,Send,Sparkles } from 'lucide-react'

type Props={lang:'en'|'es'}

declare global{interface Window{webkitSpeechRecognition?:any;SpeechRecognition?:any}}

const intents=[
  {words:['schedule','calendar','horario','calendario','assignment','asignación','asignacion'],href:'/calendar/my',label:['Open My Schedule','Abrir Mi Horario']},
  {words:['friendship group','group report','grupo de amistad','reporte del grupo','report group','reporte'],href:'/groups',label:['Open Friendship Groups','Abrir Grupos de Amistad']},
  {words:['guest','visitor','follow up','follow-up','outreach','evangelism','visita','invitado','seguimiento','evangelismo'],href:'/outreach',label:['Open Evangelism & Follow-Up','Abrir Evangelismo y Seguimiento']},
  {words:['class','course','test','exam','learn','learning','clase','curso','prueba','examen','aprender'],href:'/learning',label:['Open Learning','Abrir Aprendizaje']},
  {words:['prayer','pray','pastoral','help','oración','oracion','orar','pastoral','ayuda'],href:'/help',label:['Open Prayer / Pastoral Care','Abrir Oración / Cuidado Pastoral']},
  {words:['journey','testimony','journal','answered prayer','my story','testimonio','diario','oración contestada','oracion contestada','mi camino'],href:'/journey',label:['Open My Journey','Abrir Mi Camino']},
  {words:['serve','ministry','team','servir','ministerio','equipo'],href:'/serve',label:['Open Serve','Abrir Servir']},
]

export function ProphetCommandBox({lang}:Props){
  const es=lang==='es',router=useRouter()
  const [text,setText]=useState('')
  const [listening,setListening]=useState(false)
  const [speechError,setSpeechError]=useState('')
  const match=useMemo(()=>{const q=text.toLowerCase();return intents.find(i=>i.words.some(w=>q.includes(w)))},[text])
  const startListening=()=>{
    setSpeechError('')
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition
    if(!Recognition){setSpeechError(es?'El dictado por voz no está disponible en este navegador. Puedes escribir el comando.':'Voice dictation is not available in this browser. You can type the command instead.');return}
    const recognition=new Recognition();recognition.lang=es?'es-US':'en-US';recognition.interimResults=false;recognition.maxAlternatives=1
    recognition.onstart=()=>setListening(true)
    recognition.onend=()=>setListening(false)
    recognition.onerror=()=>{setListening(false);setSpeechError(es?'No pude escuchar con claridad. Inténtalo otra vez o escribe el comando.':'I could not hear that clearly. Try again or type the command.')}
    recognition.onresult=(event:any)=>{const transcript=event.results?.[0]?.[0]?.transcript||'';setText(transcript)}
    recognition.start()
  }
  const go=()=>{if(match)router.push(`${match.href}${es?'?lang=es':''}`)}
  return <section className="card" style={{padding:18,marginBottom:18}}>
    <div className="pill">{es?'HABLA CON EL PROFETA':'TALK TO THE PROPHET'}</div>
    <div className="row" style={{alignItems:'flex-start',marginTop:10}}><Sparkles size={22}/><div><h2 style={{margin:'0 0 5px'}}>{es?'Dime qué necesitas hacer.':'Tell me what you need to do.'}</h2><p className="small muted" style={{margin:0}}>{es?'Esta versión piloto puede escuchar o leer tu pedido y llevarte al lugar correcto. La ejecución automática con confirmación se está agregando después.':'This pilot version can listen to or read your request and take you to the right action area. Confirmed automatic execution is the next layer being added.'}</p></div></div>
    <div style={{display:'flex',gap:9,marginTop:14,alignItems:'stretch'}}><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} style={{flex:1,background:'#0e0b13',border:'1px solid var(--line)',borderRadius:12,color:'white',padding:12,resize:'vertical'}} placeholder={es?'Ejemplo: “Profeta, necesito llenar el reporte del grupo de esta noche.”':'Example: “Prophet, I need to fill out tonight’s Friendship Group report.”'}/><button className="ghost" type="button" onClick={startListening} title={es?'Hablar':'Speak'} style={{minWidth:54}}>{listening?<MicOff/>:<Mic/>}</button></div>
    {speechError&&<div className="notice error">{speechError}</div>}
    {text&&<div className={match?'notice success':'notice'} style={{marginBottom:0}}>{match?<div className="row" style={{justifyContent:'space-between'}}><span>{es?'Entendí el área:':'I found the right area:'} <strong>{match.label[es?1:0]}</strong></span><button className="btn" type="button" onClick={go}><Send size={13}/> {es?'Ir':'Go'}</button></div>:<span>{es?'Todavía no reconozco esa acción con seguridad. No voy a adivinar ni cambiar datos.':'I do not recognize that action safely yet. I will not guess or change data.'}</span>}</div>}
  </section>
}
