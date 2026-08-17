export type JourneySignals={
  holyGhost?:boolean|null
  baptized?:boolean|null
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

export function getNextStep(s:JourneySignals):NextStep{
  if(s.holyGhost===false||s.baptized===false){
    return {title:'Continue your New Birth journey',body:'Connect with church leadership about your next step in baptism and receiving the Holy Ghost.',action:'View my journey',href:'/profile',reason:'New Birth milestone'}
  }
  if(s.holyGhost==null&&s.baptized==null){
    return {title:'Complete your verified journey record',body:'Your leadership-verified New Birth milestones have not been recorded yet. Keeping this current helps Kingdom Network recommend the right path.',action:'View my journey',href:'/profile',reason:'Journey record'}
  }
  if(s.firstSteps!=='completed'){
    return {title:'Continue First Steps',body:'Build the foundation first. Work through your First Steps lessons and track your progress in the Learning Center.',action:'Open First Steps',href:'/learning',reason:'Discipleship foundation'}
  }
  if(s.groupCount<1){
    return {title:'Connect with a Friendship Group',body:'Discipleship grows through relationships. Find a group where you can connect, grow and be cared for.',action:'Explore groups',href:'/groups',reason:'Community connection'}
  }
  if(s.soulWinning!=='completed'){
    return {title:'Grow in Effective Soul Winning',body:'Your foundation is growing. The next step is learning how to reach people, follow up and share your faith effectively.',action:'Open Learning',href:'/learning',reason:'Evangelism training'}
  }
  if(s.bibleStudyTeacher!=='approved'){
    return {title:'Prepare to teach Bible studies',body:'Build toward becoming an approved Bible-study teacher through training, practice and leadership verification.',action:'Open Learning',href:'/learning',reason:'Disciple-making'}
  }
  if(s.serveCount<1){
    return {title:'Find your place to serve',body:'You have built a strong foundation. Explore ministry opportunities and see where your gifts can strengthen the church.',action:'Explore ministries',href:'/serve',reason:'Ministry connection'}
  }
  return {title:'Help someone else take their next step',body:'You are connected, growing and serving. Use Outreach to help another person move from invitation to discipleship.',action:'Open Outreach',href:'/outreach',reason:'Multiplication'}
}
