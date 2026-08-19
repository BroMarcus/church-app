export type JourneySignals={
  holyGhost?:boolean|null
  baptized?:boolean|null
  newConvertAvailable?:boolean
  newConvertCompleted?:boolean
  firstSteps?:string|null
  soulWinning?:string|null
  bibleStudyTeacher?:string|null
  groupCount:number
  serveCount:number
}

export type NextStep={
  title:string
  body:string
  action:string
  href:string
  reason:string
}

export function getNextStep(s:JourneySignals,lang:'en'|'es'='en'):NextStep{
  const es=lang==='es'
  if(s.baptized===false&&s.newConvertAvailable&&!s.newConvertCompleted){
    return es
      ? {title:'Comienza los Estudios Bíblicos para Nuevos Convertidos',body:'Construye un fundamento bíblico claro antes del bautismo por medio de la ruta para Nuevos Convertidos en el Centro de Aprendizaje.',action:'Abrir estudios',href:'/learning',reason:'Ruta de Nuevo Convertido'}
      : {title:'Start the New Convert Bible Studies',body:'Build a clear biblical foundation before baptism through the New Convert study pathway in the Learning Center.',action:'Open New Convert studies',href:'/learning',reason:'New Convert pathway'}
  }
  if(s.baptized===false){
    return es
      ? {title:'Da tu próximo paso hacia el bautismo',body:'Has llegado a la siguiente parte de tu camino de Nuevo Nacimiento. Habla con el liderazgo de tu iglesia sobre el bautismo en el nombre de Jesús.',action:'Ver Mi Camino',href:'/journey',reason:'Bautismo'}
      : {title:'Take your next step toward baptism',body:'You have reached the next part of your New Birth journey. Connect with church leadership about baptism in Jesus’ name.',action:'View my journey',href:'/journey',reason:'Baptism'}
  }
  if(s.holyGhost===false){
    return es
      ? {title:'Continúa tu camino de Nuevo Nacimiento',body:'Mantente conectado con el liderazgo de tu iglesia mientras continúas buscando la promesa del Espíritu Santo.',action:'Ver Mi Camino',href:'/journey',reason:'Espíritu Santo'}
      : {title:'Continue your New Birth journey',body:'Stay connected with church leadership as you continue seeking the promise of the Holy Ghost.',action:'View my journey',href:'/journey',reason:'Holy Ghost'}
  }
  if(s.holyGhost==null||s.baptized==null){
    return es
      ? {title:'Completa tu registro de camino verificado',body:'Uno o más hitos de Nuevo Nacimiento verificados por liderazgo todavía no están registrados. Mantenerlos al día ayuda a Kingdom Network a recomendar el camino correcto.',action:'Ver Mi Camino',href:'/journey',reason:'Registro del camino'}
      : {title:'Complete your verified journey record',body:'One or more leadership-verified New Birth milestones have not been recorded yet. Keeping this current helps Kingdom Network recommend the right path.',action:'View my journey',href:'/journey',reason:'Journey record'}
  }
  if(s.firstSteps!=='completed'){
    return es
      ? {title:'Continúa Primeros Pasos',body:'Fortalece tu fundamento. Continúa tus lecciones, sesiones y progreso de Primeros Pasos en el Centro de Aprendizaje.',action:'Abrir Primeros Pasos',href:'/learning',reason:'Fundamento de discipulado'}
      : {title:'Continue First Steps',body:'Build the foundation next. Work through your First Steps lessons, classroom sessions and progress in the Learning Center.',action:'Open First Steps',href:'/learning',reason:'Discipleship foundation'}
  }
  if(s.groupCount<1){
    return es
      ? {title:'Conéctate con un Grupo de Amistad',body:'El discipulado crece por medio de relaciones. Encuentra un grupo donde puedas conectarte, crecer y recibir cuidado.',action:'Explorar grupos',href:'/groups',reason:'Conexión con la comunidad'}
      : {title:'Connect with a Friendship Group',body:'Discipleship grows through relationships. Find a group where you can connect, grow and be cared for.',action:'Explore groups',href:'/groups',reason:'Community connection'}
  }
  if(s.soulWinning!=='completed'){
    return es
      ? {title:'Crece en Evangelismo Efectivo',body:'Tu fundamento está creciendo. El próximo paso es aprender a alcanzar personas, dar seguimiento y compartir tu fe de manera efectiva.',action:'Abrir Aprendizaje',href:'/learning',reason:'Capacitación en evangelismo'}
      : {title:'Grow in Effective Soul Winning',body:'Your foundation is growing. The next step is learning how to reach people, follow up and share your faith effectively.',action:'Open Learning',href:'/learning',reason:'Evangelism training'}
  }
  if(s.bibleStudyTeacher!=='approved'){
    return es
      ? {title:'Prepárate para enseñar estudios bíblicos',body:'Avanza hacia ser un Guía de Estudio Bíblico aprobado por medio de capacitación, evaluación, práctica y verificación del liderazgo.',action:'Abrir Aprendizaje',href:'/learning',reason:'Hacer discípulos'}
      : {title:'Prepare to teach Bible studies',body:'Build toward becoming an approved Bible Study Guide through training, assessment, practice and leadership verification.',action:'Open Learning',href:'/learning',reason:'Disciple-making'}
  }
  if(s.serveCount<1){
    return es
      ? {title:'Encuentra tu lugar para servir',body:'Has construido un fundamento sólido. Explora oportunidades de ministerio y descubre dónde tus dones pueden fortalecer a la iglesia.',action:'Explorar ministerios',href:'/serve',reason:'Conexión ministerial'}
      : {title:'Find your place to serve',body:'You have built a strong foundation. Explore ministry opportunities and see where your gifts can strengthen the church.',action:'Explore ministries',href:'/serve',reason:'Ministry connection'}
  }
  return es
    ? {title:'Ayuda a alguien más a dar su próximo paso',body:'Estás conectado, creciendo y sirviendo. Usa Evangelismo para ayudar a otra persona a avanzar desde una invitación hasta el discipulado.',action:'Abrir Evangelismo',href:'/outreach',reason:'Multiplicación'}
    : {title:'Help someone else take their next step',body:'You are connected, growing and serving. Use Outreach to help another person move from invitation to discipleship.',action:'Open Outreach',href:'/outreach',reason:'Multiplication'}
}