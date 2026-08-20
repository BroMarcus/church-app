import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE_URL = process.env.QA_BASE_URL || 'https://kingdom-network.vercel.app'
const PASSWORD = process.env.QA_PASSWORD || 'KN-QA-2026!R7x9-Mock'
const OUT = 'qa-artifacts'

const personas = [
  {name:'pastor',email:'kn.qa.pastor.20260820@qa.invalid',lang:'en',viewport:{width:1440,height:1000}},
  {name:'group-leader',email:'kn.qa.group.20260820@qa.invalid',lang:'en',viewport:{width:390,height:844}},
  {name:'ministry-leader',email:'kn.qa.ministry.20260820@qa.invalid',lang:'en',viewport:{width:390,height:844}},
  {name:'member',email:'kn.qa.member.20260820@qa.invalid',lang:'en',viewport:{width:390,height:844}},
  {name:'newbie-es',email:'kn.qa.newbie.20260820@qa.invalid',lang:'es',viewport:{width:390,height:844}}
]

const memberRoutes = [
  '/', '/today', '/profile', '/journey', '/journey/memories', '/learning', '/learning/rewards', '/learning/transcript',
  '/calendar', '/calendar/my', '/groups', '/teams', '/serve', '/prayer', '/testimonies', '/messages', '/notifications',
  '/directory', '/business', '/documents', '/media', '/network', '/network/updates', '/updates', '/library', '/resources',
  '/search', '/guide', '/help', '/feedback', '/fundraising', '/forms', '/account/privacy', '/account/security',
  '/account/notifications', '/account/data', '/account/prophet', '/prophet', '/organization', '/district'
]

const leaderRoutes = [
  '/rosters', '/teams/manage', '/calendar/shared', '/learning/teacher', '/learning/admin/teacher', '/church/today'
]

const pastorRoutes = [
  '/church', '/church/admin-backup', '/church/analytics', '/church/audit', '/church/coordination', '/church/export',
  '/church/features', '/church/feedback', '/church/finance', '/church/forms', '/church/group-growth', '/church/health',
  '/church/import', '/church/inbox', '/church/invite-person', '/church/invites', '/church/join-center', '/church/launch',
  '/church/leadership', '/church/member-control', '/church/member-records', '/church/member-records/review',
  '/church/message-reports', '/church/milestone-review', '/church/momentum', '/church/pastor', '/church/readiness',
  '/church/reports', '/church/roles', '/church/schedule-health', '/church/settings', '/church/setup-inbox',
  '/church/testimony-review', '/content', '/calendar/manage', '/learning/admin', '/learning/admin/course-builder',
  '/learning/admin/first-steps', '/learning/admin/weekly-series', '/learning/manage', '/learning/manage/assessment-upgrades',
  '/help/admin', '/outreach', '/outreach/communications', '/outreach/communications/provider'
]

const representativeForbidden = [
  '/church', '/church/finance', '/church/settings', '/church/member-control', '/church/roles', '/church/forms',
  '/content', '/calendar/manage', '/learning/admin/course-builder', '/outreach/communications/provider', '/help/admin'
]

const keyScreens = new Set([
  '/', '/today', '/profile', '/journey', '/learning', '/calendar', '/groups', '/teams', '/guide', '/forms', '/business',
  '/church', '/church/settings', '/church/finance', '/church/forms', '/church/member-control', '/content', '/calendar/manage',
  '/teams/manage', '/outreach', '/learning/admin/course-builder'
])

const actionPagesPastor = [
  '/church/settings', '/content?section=courses', '/content?section=lessons', '/content?section=classes',
  '/content?section=events', '/content?section=assessments', '/church/forms', '/groups', '/teams/manage', '/calendar/manage',
  '/outreach', '/fundraising'
]
const actionPagesMember = ['/profile','/prayer','/testimonies','/business','/feedback','/forms']

const report = {
  startedAt:new Date().toISOString(), baseUrl:BASE_URL, infrastructure:{}, public:[], personas:{}, actionRuns:[], findings:[]
}

const sleep = ms => new Promise(r=>setTimeout(r,ms))
const safe = value => String(value).replace(/[^a-z0-9_-]+/gi,'_').replace(/^_+|_+$/g,'').slice(0,90) || 'page'
const uniq = arr => [...new Set(arr)]

async function ensureDirs(){
  await mkdir(OUT,{recursive:true})
  await mkdir(path.join(OUT,'screens'),{recursive:true})
}

function addFinding(severity, persona, route, kind, detail){
  report.findings.push({severity,persona,route,kind,detail})
}

async function inspectPage(page, persona, route, response, elapsedMs, consoleErrors, pageErrors){
  const actualUrl = page.url()
  const body = await page.locator('body').innerText().catch(()=> '')
  const state = await page.evaluate(()=>{
    const visible = el => {
      const s=getComputedStyle(el); const r=el.getBoundingClientRect();
      return s.visibility!=='hidden' && s.display!=='none' && r.width>0 && r.height>0
    }
    const buttons=[...document.querySelectorAll('button')].filter(visible).map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim()).filter(Boolean)
    const links=[...document.querySelectorAll('a')].filter(visible).map(a=>(a.innerText||a.getAttribute('aria-label')||'').trim()).filter(Boolean)
    const forms=[...document.querySelectorAll('form')].filter(visible).length
    const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(h=>(h.textContent||'').trim()).filter(Boolean)
    const scrollWidth=document.documentElement.scrollWidth
    return {buttons,links,forms,headings,overflow:scrollWidth>window.innerWidth+6,scrollWidth,viewportWidth:window.innerWidth}
  }).catch(()=>({buttons:[],links:[],forms:0,headings:[],overflow:false}))

  const jargon = uniq((body.match(/\b(Supabase|Postgres(?:QL)?|RPC|localhost|undefined|NaN|\[object Object\]|database error|provider error|stack trace)\b/gi)||[]).map(v=>v.toLowerCase()))
  const duplicateButtons = Object.entries(state.buttons.reduce((m,b)=>{m[b]=(m[b]||0)+1;return m},{})).filter(([,n])=>n>=3)
  const heavy = state.buttons.length>14 || state.links.length>30 || state.headings.length>12 || body.length>9000
  const redirectedToLogin = actualUrl.includes('/login') && !route.startsWith('/login')
  const record={route,actualUrl,status:response?.status?.()??null,elapsedMs,redirectedToLogin,bodyLength:body.length,...state,jargon,duplicateButtons,consoleErrors:[...consoleErrors],pageErrors:[...pageErrors]}

  if(state.overflow) addFinding('high',persona,route,'mobile-overflow',`Page width ${state.scrollWidth}px exceeds viewport ${state.viewportWidth}px`)
  if(jargon.length) addFinding('medium',persona,route,'technical-jargon',`Visible technical text: ${jargon.join(', ')}`)
  if(consoleErrors.length||pageErrors.length) addFinding('high',persona,route,'browser-error',`console=${consoleErrors.slice(0,3).join(' | ')} page=${pageErrors.slice(0,3).join(' | ')}`)
  if(elapsedMs>4500) addFinding('medium',persona,route,'slow-page',`${elapsedMs}ms to DOM ready + settle`)
  if(heavy) addFinding('low',persona,route,'high-cognitive-load',`${state.buttons.length} buttons, ${state.links.length} links, ${state.headings.length} headings, ${body.length} visible characters`)
  if(duplicateButtons.length) addFinding('low',persona,route,'duplicate-actions',duplicateButtons.map(([b,n])=>`${b} ×${n}`).join(', '))

  if(keyScreens.has(route.split('?')[0]) || state.overflow || consoleErrors.length || pageErrors.length){
    const file=path.join(OUT,'screens',`${safe(persona)}__${safe(route)}.png`)
    await page.screenshot({path:file,fullPage:true}).catch(()=>{})
    record.screenshot=file
  }
  return record
}

async function gotoAudit(page, persona, route){
  const consoleErrors=[]; const pageErrors=[]
  const onConsole=msg=>{if(msg.type()==='error')consoleErrors.push(msg.text().slice(0,500))}
  const onPageError=err=>pageErrors.push(String(err.message||err).slice(0,500))
  page.on('console',onConsole); page.on('pageerror',onPageError)
  const start=Date.now()
  let response=null, navError=null
  try{
    response=await page.goto(BASE_URL+route,{waitUntil:'domcontentloaded',timeout:30000})
    await sleep(700)
  }catch(err){navError=String(err.message||err); addFinding('critical',persona,route,'navigation-failure',navError.slice(0,700))}
  const elapsedMs=Date.now()-start
  let record
  if(navError){record={route,actualUrl:page.url(),elapsedMs,navError}}
  else record=await inspectPage(page,persona,route,response,elapsedMs,consoleErrors,pageErrors)
  page.off('console',onConsole); page.off('pageerror',onPageError)
  return record
}

async function login(page, persona){
  await page.goto(`${BASE_URL}/login?mode=signin&lang=${persona.lang}`,{waitUntil:'domcontentloaded',timeout:30000})
  await sleep(300)
  const email=page.locator('input[name="email"]')
  const password=page.locator('input[name="password"]')
  if(!await email.count() || !await password.count()) throw new Error('Sign-in form fields not found')
  await email.fill(persona.email)
  await password.fill(PASSWORD)
  await page.locator('button[type="submit"]').first().click()
  await sleep(1400)
  if(page.url().includes('/login')){
    const text=(await page.locator('body').innerText()).slice(0,1000)
    throw new Error(`Login did not leave /login. Page says: ${text}`)
  }
  return page.url()
}

async function invalidLoginCheck(browser){
  const context=await browser.newContext({viewport:{width:390,height:844}})
  const page=await context.newPage()
  const row={flow:'invalid-login',ok:false}
  try{
    await page.goto(`${BASE_URL}/login?mode=signin&lang=en`,{waitUntil:'domcontentloaded'})
    await page.locator('input[name="email"]').fill('kn.qa.member.20260820@qa.invalid')
    await page.locator('input[name="password"]').fill('WrongPassword!123')
    await page.locator('button[type="submit"]').first().click()
    await sleep(900)
    const text=await page.locator('body').innerText()
    row.ok=/invalid|incorrect|try again|couldn.?t|wrong|sign in/i.test(text) && !/supabase|postgres|rpc/i.test(text)
    row.actualUrl=page.url(); row.messageSnippet=text.slice(0,600)
    if(!row.ok)addFinding('high','anonymous','/login','invalid-login-recovery','Invalid credentials did not produce a clear member-safe recovery message')
  }catch(err){row.error=String(err.message||err);addFinding('high','anonymous','/login','invalid-login-exception',row.error)}
  await context.close(); report.public.push(row)
}

async function publicChecks(browser){
  const context=await browser.newContext({viewport:{width:390,height:844}})
  const page=await context.newPage()
  for(const route of ['/login','/login?lang=es','/join/kingdom-qa-sandbox-20260820','/join/kingdom-qa-sandbox-20260820?lang=es','/']){
    report.public.push(await gotoAudit(page,'anonymous',route))
  }
  try{
    await page.goto(`${BASE_URL}/login?mode=signin&lang=en`,{waitUntil:'domcontentloaded'})
    const pw=page.locator('input[name="password"]')
    const toggle=page.locator('button[aria-label*="password" i]').first()
    const before=await pw.getAttribute('type')
    if(await toggle.count())await toggle.click()
    const after=await pw.getAttribute('type')
    report.public.push({flow:'password-visibility-toggle',ok:before==='password'&&after==='text',before,after})
    if(!(before==='password'&&after==='text'))addFinding('medium','anonymous','/login','password-toggle','Show/hide password did not switch input type')
  }catch(err){report.public.push({flow:'password-visibility-toggle',ok:false,error:String(err)})}
  await context.close()
}

function valueFor(name,type,index){
  const n=(name||'').toLowerCase()
  if(type==='email'||n.includes('email'))return `qa.contact.${Date.now()}@example.invalid`
  if(type==='tel'||n.includes('phone'))return '5555550188'
  if(type==='url'||n.includes('url')||n.includes('link'))return 'https://example.com/kingdom-qa'
  if(type==='date'||n.includes('date'))return '2026-08-27'
  if(type==='datetime-local')return '2026-08-27T18:30'
  if(type==='time')return '18:30'
  if(type==='number')return n.includes('score')?'80':'1'
  if(n.includes('title')||n.includes('name'))return `QA Human Walkthrough ${index}`
  if(n.includes('slug'))return `qa-human-${Date.now()}`
  if(n.includes('description')||n.includes('notes')||n.includes('bio')||n.includes('message')||n.includes('prompt')||n.includes('question'))return `Disposable QA walkthrough entry ${Date.now()}. This record may be deleted.`
  if(n.includes('correct_answer'))return '1'
  if(n.includes('options'))return 'Option A\nOption B\nOption C\nOption D'
  return `QA ${index} ${Date.now()}`
}

async function fillForm(form, index){
  const inputs=form.locator('input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])')
  const count=await inputs.count()
  for(let i=0;i<count;i++){
    const el=inputs.nth(i)
    const tag=await el.evaluate(e=>e.tagName.toLowerCase()).catch(()=> '')
    const type=(await el.getAttribute('type')||'text').toLowerCase()
    const name=await el.getAttribute('name')||''
    if(type==='submit'||type==='button'||type==='reset')continue
    if(type==='checkbox'){
      const required=await el.getAttribute('required')!==null
      if(required && !await el.isChecked())await el.check().catch(()=>{})
      continue
    }
    if(type==='radio'){
      if(!await el.isChecked())await el.check().catch(()=>{})
      continue
    }
    if(type==='file')continue
    if(tag==='select'){
      const options=await el.locator('option:not([disabled])').evaluateAll(opts=>opts.map(o=>({value:o.value,text:(o.textContent||'').trim()})))
      const pick=options.find(o=>o.value)||options[0]
      if(pick)await el.selectOption(pick.value).catch(()=>{})
      continue
    }
    const current=await el.inputValue().catch(()=> '')
    const required=await el.getAttribute('required')!==null
    if(required || !current){
      await el.fill(valueFor(name,type,index)).catch(()=>{})
    }
  }
}

async function exerciseForms(page, persona, route, limit=4){
  const result={persona,route,forms:[]}
  await page.goto(BASE_URL+route,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{})
  await sleep(700)
  if(page.url().includes('/login')){result.blocked='redirected to login';return result}
  const forms=page.locator('form')
  const count=Math.min(await forms.count(),limit)
  for(let i=0;i<count;i++){
    await page.goto(BASE_URL+route,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{})
    await sleep(500)
    const currentForms=page.locator('form')
    if(i>=await currentForms.count())break
    const form=currentForms.nth(i)
    const buttons=form.locator('button[type="submit"],button:not([type])')
    const bcount=await buttons.count()
    if(!bcount)continue
    const button=buttons.first()
    const label=((await button.innerText().catch(()=>''))||'').trim()
    if(/sign out|log out|delete account|remove account|revoke|permanently delete/i.test(label)){result.forms.push({index:i,label,skipped:'destructive identity/access action'});continue}
    try{
      await fillForm(form,i+1)
      const before=page.url()
      await button.click({timeout:8000})
      await sleep(1200)
      const after=page.url()
      const text=(await page.locator('body').innerText().catch(()=> '')).slice(0,1800)
      const errorText=(text.match(/(?:error|failed|couldn.?t|not authorized|invalid|required|try again)[^\n]{0,180}/i)||[])[0]||null
      const ok=!/supabase|postgres|rpc|stack trace|localhost/i.test(text)
      result.forms.push({index:i,label,before,after,ok,errorText,textSnippet:text.slice(0,500)})
      if(!ok)addFinding('high',persona,route,'form-technical-error',`Form “${label}” exposed technical backend text`)
    }catch(err){
      const msg=String(err.message||err)
      result.forms.push({index:i,label,ok:false,exception:msg.slice(0,700)})
      addFinding('medium',persona,route,'form-action-failure',`Form “${label}”: ${msg.slice(0,350)}`)
    }
  }
  return result
}

async function guideHelpCheck(page, persona){
  const row={persona,flow:'page-guide-help',ok:false}
  try{
    await page.goto(BASE_URL+'/',{waitUntil:'domcontentloaded'});await sleep(500)
    const help=page.locator('button[aria-label^="How this page works"],button:has-text("How this page works")').first()
    if(await help.count()){
      await help.click();await sleep(250)
      const text=await page.locator('body').innerText()
      row.ok=text.length>0; row.textSnippet=text.slice(-800)
    }else row.error='Help button not found'
  }catch(err){row.error=String(err)}
  if(!row.ok)addFinding('low',persona,'/','contextual-help','Contextual page guide could not be opened')
  return row
}

async function runPersona(browser, persona){
  const context=await browser.newContext({viewport:persona.viewport,locale:persona.lang==='es'?'es-US':'en-US'})
  const page=await context.newPage()
  const out={login:{ok:false},routes:[],forbiddenChecks:[],flows:[]}
  try{
    out.login.url=await login(page,persona);out.login.ok=true
  }catch(err){
    out.login.error=String(err.message||err);addFinding('critical',persona.name,'/login','login-failure',out.login.error);await context.close();return out
  }
  out.flows.push(await guideHelpCheck(page,persona.name))

  let routes=[...memberRoutes]
  if(persona.name==='pastor')routes=[...routes,...leaderRoutes,...pastorRoutes]
  else if(persona.name==='group-leader')routes=[...routes,'/rosters','/church/today']
  else if(persona.name==='ministry-leader')routes=[...routes,'/teams/manage','/calendar/shared','/learning/teacher']
  if(persona.name==='newbie-es')routes=['/start','/','/profile','/journey','/learning','/groups','/guide','/help','/calendar','/forms']

  for(const route of routes){
    const rec=await gotoAudit(page,persona.name,route)
    out.routes.push(rec)
    if(rec.redirectedToLogin && !route.startsWith('/auth/'))addFinding('high',persona.name,route,'session-or-route-access','Route returned to login while persona was already authenticated')
  }

  if(persona.name==='member'||persona.name==='newbie-es'){
    for(const route of representativeForbidden){
      const rec=await gotoAudit(page,persona.name,route)
      out.forbiddenChecks.push(rec)
      const url=rec.actualUrl||''
      const leaked = !url.includes('/login') && url.includes(route) && !/not authorized|access denied|permission/i.test((await page.locator('body').innerText().catch(()=>'')))
      if(leaked)addFinding('critical',persona.name,route,'permission-leak','Ordinary member appeared to remain on a leader/admin route')
    }
  }

  const actionPages=persona.name==='pastor'?actionPagesPastor:(persona.name==='member'?actionPagesMember:[])
  for(const route of actionPages){
    const result=await exerciseForms(page,persona.name,route)
    report.actionRuns.push(result)
  }

  await context.close()
  return out
}

async function main(){
  await ensureDirs()
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']})
  try{
    await publicChecks(browser)
    await invalidLoginCheck(browser)
    for(const persona of personas){
      report.personas[persona.name]=await runPersona(browser,persona)
    }
  }finally{
    await browser.close()
  }
  report.finishedAt=new Date().toISOString()
  const allRoutes=Object.values(report.personas).flatMap(p=>p.routes||[])
  report.summary={
    personas:Object.keys(report.personas).length,
    routeAudits:allRoutes.length,
    routeNavFailures:allRoutes.filter(r=>r.navError).length,
    unexpectedLoginRedirects:allRoutes.filter(r=>r.redirectedToLogin).length,
    actionPages:report.actionRuns.length,
    actionForms:report.actionRuns.reduce((n,r)=>n+(r.forms?.length||0),0),
    critical:report.findings.filter(f=>f.severity==='critical').length,
    high:report.findings.filter(f=>f.severity==='high').length,
    medium:report.findings.filter(f=>f.severity==='medium').length,
    low:report.findings.filter(f=>f.severity==='low').length
  }
  await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2))
  const lines=[
    '# Kingdom Network Real-User QA Walkthrough','',
    `Started: ${report.startedAt}`,`Finished: ${report.finishedAt}`,`Base: ${BASE_URL}`,'',
    '## Summary',...Object.entries(report.summary).map(([k,v])=>`- ${k}: ${v}`),'',
    '## Findings',
    ...report.findings.map((f,i)=>`${i+1}. **${f.severity.toUpperCase()} — ${f.kind}** — ${f.persona} ${f.route}: ${f.detail}`),
    '', '## Action runs',
    ...report.actionRuns.flatMap(r=>[`### ${r.persona} — ${r.route}`,...(r.forms||[]).map(f=>`- ${f.label||`form ${f.index}`}: ${f.skipped?`SKIPPED (${f.skipped})`:(f.ok?'completed':'needs review')}${f.errorText?` — ${f.errorText}`:''}${f.exception?` — ${f.exception.slice(0,220)}`:''}`)])
  ]
  await writeFile(path.join(OUT,'summary.md'),lines.join('\n'))
  console.log(JSON.stringify(report.summary,null,2))
  console.log(`QA report written to ${OUT}/report.json and ${OUT}/summary.md`)
}

main().catch(async err=>{
  report.infrastructure.fatal=String(err.stack||err)
  await ensureDirs(); await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));
  console.error(err); process.exitCode=1
})
