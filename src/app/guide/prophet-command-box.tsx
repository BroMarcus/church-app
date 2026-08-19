'use client'

import { useMemo,useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic,Send,Sparkles } from 'lucide-react'

type Props={lang:'en'|'es'}

declare global{interface Window{webkitSpeechRecognition?:any;SpeechRecognition?:any}}

const intents=[
  {words:['what do i need to do','what should i do today','today','focus','my today','qué hago hoy','que hago hoy','qué necesito hacer','que necesito hacer','enfocar','mi día','mi dia'],href:'/today',label:['My Today','Mi Día'],reply:['I can show you the few things that matter most right now: responses you owe, upcoming responsibilities, classes and your next discipleship step.','Puedo mostrarte las pocas cosas que más importan ahora: respuestas pendientes, responsabilidades próximas, clases y tu siguiente paso de discipulado.']},
  {words:['member records','member record','church records','baptism records','holy ghost records','records dashboard','registros de miembros','registro de miembro','registros de la iglesia','registros de bautismo','registros del espíritu santo','registros del espiritu santo'],href:'/church/member-records',label:['Member Records','Registros de Miembros'],reply:['I can take authorized records leaders to the searchable church records view for contact information, baptism, Holy Ghost and discipleship milestones.','Puedo llevar a los líderes autorizados de registros a la vista de miembros con contacto, bautismo, Espíritu Santo e hitos de discipulado.']},
  {words:['schedule','calendar','horario','calendario','assignment','asignación','asignacion','when do i serve','cuando sirvo'],href:'/calendar/my',label:['My Schedule','Mi Horario'],reply:['I can help you see your assignments, classes and Friendship Group schedule in one place.','Puedo ayudarte a ver tus asignaciones, clases y horario del Grupo de Amistad en un solo lugar.']},
  {words:['friendship group','group report','grupo de amistad','reporte del grupo','report group','reporte','attendance','asistencia'],href:'/groups',label:['Friendship Groups','Grupos de Amistad'],reply:['I can take you to your Friendship Group tools so you can report attendance, guests, Bible studies and ministry activity.','Puedo llevarte a las herramientas de tu Grupo de Amistad para reportar asistencia, invitados, estudios bíblicos y actividad ministerial.']},
  {words:['guest','visitor','follow up','follow-up','outreach','evangelism','visita','invitado','seguimiento','evangelismo','bible study','estudio biblico','estudio bíblico'],href:'/outreach',label:['Evangelism & Follow-Up','Evangelismo y Seguimiento'],reply:['I can help you get to the outreach pipeline to add a person, record contact, or see who needs follow-up.','Puedo llevarte al proceso de evangelismo para agregar una persona, registrar contacto o ver quién necesita seguimiento.']},
  {words:['class','course','test','exam','learn','learning','clase','curso','prueba','examen','aprender','next lesson','siguiente lección','siguiente leccion'],href:'/learning',label:['Learning Center','Centro de Aprendizaje'],reply:['I can help you continue a class, find your next lesson, or see your discipleship progress.','Puedo ayudarte a continuar una clase, encontrar tu siguiente lección o ver tu progreso de discipulado.']},
  {words:['prayer','pray','pastoral','help','oración','oracion','orar','pastoral','ayuda','counseling','consejería','consejeria'],href:'/help',label:['Prayer & Pastoral Care','Oración y Cuidado Pastoral'],reply:['I can take you to the private prayer and pastoral-care area. Sensitive requests stay in the proper permission boundary.','Puedo llevarte al área privada de oración y cuidado pastoral. Las solicitudes sensibles permanecen dentro de los permisos correctos.']},
  {words:['journey','testimony','journal','answered prayer','my story','testimonio','diario','oración contestada','oracion contestada','mi camino','milestone'],href:'/journey',label:['My Journey','Mi Camino'],reply:['I can help you review your discipleship journey, milestones and testimony history.','Puedo ayudarte a revisar tu camino de discipulado, logros e historial de testimonios.']},
  {words:['serve','ministry','team','servir','ministerio','equipo','volunteer','voluntario'],href:'/serve',label:['Serve','Servir'],reply:['I can help you find ministry opportunities, see qualification requirements, and move toward serving.','Puedo ayudarte a encontrar oportunidades de ministerio, ver requisitos y avanzar hacia servir.']},
  {words:['message','messages','contact member','mensaje','mensajes','contactar miembro'],href:'/messages',label:['Messages','Mensajes'],reply:['I can take you to private church messages so you can contact the right person.','Puedo llevarte a los mensajes privados de la iglesia para contactar a la persona correcta.']},
  {words:['directory','member directory','church family','directorio','familia de la iglesia'],href:'/directory',label:['Church Directory','Directorio de la Iglesia'],reply:['I can help you find people in your church directory.','Puedo ayudarte a encontrar personas en el directorio de tu iglesia.']},
  {words:['resource','sermon','lesson resource','scripture resource','recurso','sermón','sermon','material','escritura'],href:'/guide',label:['Trusted Resources','Recursos Confiables'],reply:['I can help you search approved church resources and keep the source authority visible.','Puedo ayudarte a buscar recursos aprobados de la iglesia y mostrar claramente la autoridad de la fuente.']}
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
    if(!Recognition){setSpeechError(es?'La voz es opcional y no está disponible en este navegador. Escribe lo que necesitas.':'Voice is optional and is not available in this browser. Just type what you need.');return}
    const recognition=new Recognition();recognition.lang=es?'es-US':'en-US';recognition.interimResults=false;recognition.maxAlternatives=1
    recognition.onstart=()=>setListening(true)
    recognition.onend=()=>setListening(false)
    recognition.onerror=()=>{setListening(false);setSpeechError(es?'No pude escuchar con claridad. Puedes escribir tu pedido.':'I could not hear that clearly. You can type your request instead.')}
    recognition.onresult=(event:any)=>{const transcript=event.results?.[0]?.[0]?.transcript||'';setText(transcript)}
    recognition.start()
  }
  const go=()=>{if(match)router.push(`${match.href}${es?'?lang=es':''}`)}
  const searchTrusted=()=>{if(text.trim())router.push(`/guide?q=${encodeURIComponent(text.trim())}${es?'&lang=es':''}`)}
  return <section className="card" style={{padding:18,marginBottom:18}}>
    <div className="pill">{es?'PREGÚNTALE AL PROFETA':'ASK THE PROPHET'}</div>
    <div className="row" style={{alignItems:'flex-start',marginTop:10}}><Sparkles size={22}/><div><h2 style={{margin:'0 0 5px'}}>{es?'Escribe como hablas normalmente.':'Type it the way you would normally say it.'}</h2><p className="small muted" style={{margin:0}}>{es?'Ejemplos: “¿Qué necesito hacer hoy?”, “¿Cuándo me toca servir?”, “Necesito reportar el grupo”, o “Quiero continuar mi clase”.':'Examples: “What do I need to do today?”, “When do I serve?”, “I need to report my group,” or “I want to continue my class.”'}</p></div></div>
    <div style={{display:'flex',gap:9,marginTop:14,alignItems:'stretch'}}><textarea value={text} onChange={e=>setText(e.target.value)} rows={3} style={{flex:1,background:'#0e0b13',border:'1px solid var(--line)',borderRadius:12,color:'white',padding:12,resize:'vertical'}} placeholder={es?'¿Qué necesitas hacer hoy?':'What do you need to do today?'}/><button className="ghost" type="button" onClick={startListening} title={es?'Voz opcional':'Optional voice'} style={{minWidth:54,opacity:listening ? .65 : 1}}><Mic/></button></div>
    {speechError&&<div className="notice error">{speechError}</div>}
    {text&&<div className={match?'notice success':'notice'} style={{marginBottom:0}}>{match?<div><strong>{es?'Te puedo ayudar con esto:':'I can help with that:'}</strong><p style={{margin:'6px 0 10px'}}>{match.reply[es?1:0]}</p><div className="row" style={{justifyContent:'space-between',flexWrap:'wrap'}}><span className="small muted">{es?'Área recomendada:':'Recommended area:'} <strong>{match.label[es?1:0]}</strong></span><button className="btn" type="button" onClick={go}><Send size={13}/> {es?'Abrir ahora':'Open now'}</button></div></div>:<div><strong>{es?'Todavía no puedo ejecutar eso directamente.':'I can’t safely execute that directly yet.'}</strong><p style={{margin:'6px 0 10px'}}>{es?'No voy a inventar una acción. Puedo buscar tus recursos confiables con esas mismas palabras para ayudarte a encontrar la respuesta o el siguiente paso.':'I won’t guess. I can search your trusted church resources using those same words to help find an answer or next step.'}</p><button className="ghost" type="button" onClick={searchTrusted}>{es?'Buscar recursos confiables':'Search trusted resources'}</button></div>}</div>}
  </section>
}
