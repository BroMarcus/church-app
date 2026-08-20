import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const BASE=process.env.QA_BASE_URL||'https://kingdom-network.vercel.app'
const PASSWORD=process.env.QA_PASSWORD
if(!PASSWORD) throw new Error('QA_PASSWORD is required')
const OUT='qa-artifacts-v2'

const personas=[
 {name:'pastor',email:'kn.qa.pastor.20260820@qa.invalid',lang:'en',vp:{width:1440,height:1000}},
 {name:'group-leader',email:'kn.qa.group.20260820@qa.invalid',lang:'en',vp:{width:390,height:844}},
 {name:'ministry-leader',email:'kn.qa.ministry.20260820@qa.invalid',lang:'en',vp:{width:390,height:844}},
 {name:'member',email:'kn.qa.member.20260820@qa.invalid',lang:'en',vp:{width:390,height:844}},
 {name:'newbie-es',email:'kn.qa.newbie.20260820@qa.invalid',lang:'es',vp:{width:390,height:844}},
]

const memberRoutes=['/','/today','/start','/profile','/journey','/journey/memories','/learning','/learning/rewards','/learning/transcript','/calendar','/calendar/my','/groups','/teams','/serve','/prayer','/testimonies','/messages','/notifications','/directory','/business','/documents','/media','/network','/network/updates','/updates','/library','/resources','/search','/guide','/help','/feedback','/fundraising','/forms','/account/privacy','/account/security','/account/notifications','/account/data','/account/prophet','/prophet','/organization','/district']
const leaderRoutes=['/rosters','/teams/manage','/calendar/shared','/learning/teacher','/learning/admin/teacher','/church/today']
const pastorRoutes=['/church','/church/admin-backup','/church/analytics','/church/audit','/church/coordination','/church/export','/church/features','/church/feedback','/church/finance','/church/forms','/church/group-growth','/church/health','/church/import','/church/inbox','/church/invite-person','/church/invites','/church/join-center','/church/launch','/church/leadership','/church/member-control','/church/member-records','/church/member-records/review','/church/message-reports','/church/milestone-review','/church/momentum','/church/pastor','/church/readiness','/church/reports','/church/roles','/church/schedule-health','/church/settings','/church/setup-inbox','/church/testimony-review','/content','/calendar/manage','/learning/admin','/learning/admin/course-builder','/learning/admin/first-steps','/learning/admin/weekly-series','/learning/manage','/learning/manage/assessment-upgrades','/help/admin','/outreach','/outreach/communications','/outreach/communications/provider']
const forbidden=['/church','/church/finance','/church/settings','/church/member-control','/church/roles','/church/forms','/content','/calendar/manage','/learning/admin/course-builder','/outreach/communications/provider','/help/admin']
const pastorActions=['/church/settings','/content?section=courses','/content?section=lessons','/content?section=classes','/content?section=events','/content?section=assessments','/church/forms','/groups','/teams/manage','/calendar/manage','/outreach','/fundraising']
const memberActions=['/profile','/prayer','/testimonies','/business','/feedback','/forms']
const key=new Set(['/','/today','/start','/profile','/journey','/learning','/calendar','/groups','/guide','/forms','/church','/church/momentum','/church/settings','/church/forms','/content','/learning/admin/course-builder'])

const report={startedAt:new Date().toISOString(),public:[],personas:{},actions:[],findings:[]}
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const safe=s=>String(s).replace(/[^a-z0-9_-]+/gi,'_').slice(0,80)||'page'
function finding(severity,persona,route,kind,detail){report.findings.push({severity,persona,route,kind,detail});console.log(`FINDING ${severity} ${persona} ${route} ${kind}: ${detail}`)}

async function dirs(){await mkdir(OUT,{recursive:true});await mkdir(path.join(OUT,'screens'),{recursive:true})}
async function snap(page,persona,route){await page.screenshot({path:path.join(OUT,'screens',`${safe(persona)}__${safe(route)}.png`),fullPage:true,timeout:5000}).catch(()=>{})}

async function audit(page,persona,route){
 console.log(`AUDIT ${persona} ${route}`)
 const errors=[];const pageErrors=[]
 const oc=m=>{if(m.type()==='error')errors.push(m.text().slice(0,300))};const oe=e=>pageErrors.push(String(e.message||e).slice(0,300))
 page.on('console',oc);page.on('pageerror',oe)
 const t=Date.now();let response=null,navError=null
 try{response=await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:12000});await pause(250)}catch(e){navError=String(e.message||e)}
 const elapsed=Date.now()-t;const actual=page.url();let body='';let dom={buttons:[],links:[],forms:0,heads:[],overflow:false,width:0,vw:0}
 if(!navError){body=await page.locator('body').innerText({timeout:4000}).catch(()=> '');dom=await page.evaluate(()=>{const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'};return{buttons:[...document.querySelectorAll('button')].filter(vis).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()).filter(Boolean),links:[...document.querySelectorAll('a')].filter(vis).map(e=>(e.innerText||e.getAttribute('aria-label')||'').trim()).filter(Boolean),forms:[...document.querySelectorAll('form')].filter(vis).length,heads:[...document.querySelectorAll('h1,h2,h3')].filter(vis).map(e=>(e.textContent||'').trim()).filter(Boolean),overflow:document.documentElement.scrollWidth>innerWidth+6,width:document.documentElement.scrollWidth,vw:innerWidth}}).catch(()=>dom)}
 const technical=(body.match(/\b(Supabase|Postgres(?:QL)?|RPC|localhost|undefined|NaN|\[object Object\]|database error|provider error|stack trace|schema cache)\b/gi)||[])
 const rec={route,actual,status:response?.status?.()??null,elapsed,navError,bodyLength:body.length,...dom,errors,pageErrors,technical}
 if(navError)finding('critical',persona,route,'navigation-failure',navError.slice(0,300))
 if(dom.overflow)finding('high',persona,route,'mobile-overflow',`${dom.width}px on ${dom.vw}px viewport`)
 if(errors.length||pageErrors.length)finding('high',persona,route,'browser-error',[...errors,...pageErrors].slice(0,2).join(' | '))
 if(technical.length)finding('medium',persona,route,'visible-technical-jargon',[...new Set(technical)].join(', '))
 if(elapsed>4500)finding('medium',persona,route,'slow-page',`${elapsed}ms`)
 if(dom.buttons.length>14||dom.links.length>30||dom.heads.length>12||body.length>9000)finding('low',persona,route,'high-cognitive-load',`${dom.buttons.length} buttons, ${dom.links.length} links, ${dom.heads.length} headings, ${body.length} chars`)
 if(key.has(route.split('?')[0])||navError||dom.overflow||errors.length||pageErrors.length)await snap(page,persona,route)
 page.off('console',oc);page.off('pageerror',oe);return rec
}

async function login(page,p){
 console.log(`LOGIN ${p.name}`)
 await page.goto(`${BASE}/login?mode=signin&lang=${p.lang}`,{waitUntil:'domcontentloaded',timeout:12000})
 await page.locator('input[name="email"]').fill(p.email)
 await page.locator('input[name="password"]').fill(PASSWORD)
 await page.locator('button[type="submit"]').first().click({timeout:5000,noWaitAfter:true})
 for(let i=0;i<20&&page.url().includes('/login');i++)await pause(150)
 if(page.url().includes('/login'))throw new Error((await page.locator('body').innerText().catch(()=> 'Login failed')).slice(0,650))
 return page.url()
}

function fillValue(name,type,i){const n=(name||'').toLowerCase();if(type==='email'||n.includes('email'))return`qa.${Date.now()}@example.invalid`;if(type==='tel'||n.includes('phone'))return'5555550188';if(type==='url'||n.includes('url'))return'https://example.com/qa';if(type==='date')return'2026-08-27';if(type==='time')return'18:30';if(type==='datetime-local')return'2026-08-27T18:30';if(type==='number')return n.includes('score')?'80':'1';if(n.includes('correct_answer'))return'1';if(n.includes('options'))return'Option A\nOption B\nOption C';if(n.includes('title')||n.includes('name'))return`QA Walkthrough ${i}`;return`Disposable QA entry ${i} ${Date.now()}`}
async function fillForm(form,i){const els=form.locator('input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])');for(let j=0;j<await els.count();j++){const e=els.nth(j),tag=await e.evaluate(x=>x.tagName.toLowerCase()).catch(()=>''),type=(await e.getAttribute('type')||'text').toLowerCase(),name=await e.getAttribute('name')||'';if(['submit','button','reset','file'].includes(type))continue;if(type==='checkbox'){if(await e.getAttribute('required')!==null)await e.check().catch(()=>{});continue}if(type==='radio'){if(!await e.isChecked())await e.check().catch(()=>{});continue}if(tag==='select'){const opts=await e.locator('option:not([disabled])').evaluateAll(o=>o.map(x=>x.value).filter(Boolean));if(opts[0])await e.selectOption(opts[0]).catch(()=>{});continue}const current=await e.inputValue().catch(()=>'');if(!current||await e.getAttribute('required')!==null)await e.fill(fillValue(name,type,i)).catch(()=>{})}}

async function oneSafeAction(page,persona,route){
 console.log(`ACTION ${persona} ${route}`);const out={persona,route,ok:false}
 try{await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:12000});await pause(300);if(page.url().includes('/login')){out.reason='login redirect';return out}
  const forms=page.locator('form');out.formCount=await forms.count();let chosen=null,label=''
  for(let i=0;i<Math.min(out.formCount,8);i++){const f=forms.nth(i),b=f.locator('button[type="submit"],button:not([type])').first();if(!await b.count())continue;const text=((await b.innerText().catch(()=>''))||'').trim();if(/sign out|log out|delete account|remove account|revoke|permanently delete|archive church/i.test(text))continue;chosen=f;label=text;break}
  if(!chosen){out.reason='no safe submit form';return out}out.label=label;await fillForm(chosen,1);const btn=chosen.locator('button[type="submit"],button:not([type])').first();const before=page.url();await btn.click({timeout:5000,noWaitAfter:true}).catch(e=>{out.clickError=String(e.message||e).slice(0,250)});await pause(1100);const after=page.url(),text=(await page.locator('body').innerText({timeout:3000}).catch(()=> '')).slice(0,1800);out.before=before;out.after=after;out.text=text.slice(0,600);out.ok=!out.clickError&&!/supabase|postgres|rpc|schema cache|stack trace/i.test(text);if(!out.ok)finding('medium',persona,route,'action-needs-review',`${label||'form'} ${out.clickError||text.slice(0,220)}`);return out
 }catch(e){out.error=String(e.message||e).slice(0,400);finding('medium',persona,route,'action-exception',out.error);return out}}

async function publicChecks(browser){const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();p.setDefaultTimeout(5000);p.setDefaultNavigationTimeout(12000);for(const r of ['/login','/login?lang=es','/join/kingdom-qa-sandbox-20260820','/join/kingdom-qa-sandbox-20260820?lang=es','/'])report.public.push(await audit(p,'anonymous',r));try{await p.goto(`${BASE}/login?mode=signin&lang=en`,{waitUntil:'domcontentloaded',timeout:12000});const pw=p.locator('input[name="password"]'),toggle=p.locator('button[aria-label*="password" i]').first();const before=await pw.getAttribute('type');if(await toggle.count())await toggle.click();const after=await pw.getAttribute('type');report.public.push({flow:'password-toggle',ok:before==='password'&&after==='text',before,after})}catch(e){report.public.push({flow:'password-toggle',ok:false,error:String(e)})}
 try{await p.goto(`${BASE}/login?mode=signin&lang=en`,{waitUntil:'domcontentloaded',timeout:12000});await p.locator('input[name="email"]').fill('kn.qa.member.20260820@qa.invalid');await p.locator('input[name="password"]').fill('WrongPassword!123');await p.locator('button[type="submit"]').first().click({noWaitAfter:true});await pause(700);const text=await p.locator('body').innerText();const ok=/could not|check your information|try again|no pudimos/i.test(text)&&!/supabase|postgres|rpc/i.test(text);report.public.push({flow:'invalid-login',ok,text:text.slice(0,450)});if(!ok)finding('high','anonymous','/login','invalid-login-message','Recovery message was unclear or technical')}catch(e){finding('medium','anonymous','/login','invalid-login-check',String(e).slice(0,300))}await c.close()}

async function runPersona(browser,p){const c=await browser.newContext({viewport:p.vp,locale:p.lang==='es'?'es-US':'en-US'}),page=await c.newPage();page.setDefaultTimeout(5000);page.setDefaultNavigationTimeout(12000);const out={login:{ok:false},routes:[],forbidden:[]};try{out.login.url=await login(page,p);out.login.ok=true}catch(e){out.login.error=String(e.message||e);finding('critical',p.name,'/login','login-failure',out.login.error);await c.close();return out}
 let routes=p.name==='newbie-es'?['/start','/','/profile','/journey','/learning','/groups','/guide','/help','/calendar','/forms']:memberRoutes;if(p.name==='pastor')routes=[...routes,...leaderRoutes,...pastorRoutes];else if(p.name==='group-leader')routes=[...routes,'/rosters','/church/today'];else if(p.name==='ministry-leader')routes=[...routes,'/teams/manage','/calendar/shared','/learning/teacher'];for(const r of routes)out.routes.push(await audit(page,p.name,r))
 if(['member','newbie-es'].includes(p.name)){for(const r of forbidden){const rec=await audit(page,p.name,r);out.forbidden.push(rec);const body=await page.locator('body').innerText().catch(()=>'');const denied=rec.actual.includes('/login')||rec.actual===`${BASE}/`||rec.actual===`${BASE}`||/not authorized|access denied|permission/i.test(body);if(!denied)finding('critical',p.name,r,'permission-leak',`Member stayed on protected route: ${rec.actual}`)}}
 const acts=p.name==='pastor'?pastorActions:(p.name==='member'?memberActions:[]);for(const r of acts)report.actions.push(await oneSafeAction(page,p.name,r));await c.close();return out}

async function main(){await dirs();const browser=await chromium.launch({headless:true});try{await publicChecks(browser);for(const p of personas)report.personas[p.name]=await runPersona(browser,p)}finally{await browser.close()}report.finishedAt=new Date().toISOString();const routes=Object.values(report.personas).flatMap(x=>x.routes||[]);report.summary={personas:Object.keys(report.personas).length,routeAudits:routes.length,navFailures:routes.filter(x=>x.navError).length,actions:report.actions.length,actionsOk:report.actions.filter(x=>x.ok).length,critical:report.findings.filter(x=>x.severity==='critical').length,high:report.findings.filter(x=>x.severity==='high').length,medium:report.findings.filter(x=>x.severity==='medium').length,low:report.findings.filter(x=>x.severity==='low').length};await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));const md=['# Kingdom Network Human QA v2','',...Object.entries(report.summary).map(([k,v])=>`- ${k}: ${v}`),'','## Findings',...report.findings.map((f,i)=>`${i+1}. **${f.severity.toUpperCase()} ${f.kind}** — ${f.persona} ${f.route}: ${f.detail}`),'','## Actions',...report.actions.map(a=>`- ${a.persona} ${a.route} — ${a.label||a.reason||'form'} — ${a.ok?'OK':'REVIEW'}`)];await writeFile(path.join(OUT,'summary.md'),md.join('\n'));console.log('FINAL_SUMMARY '+JSON.stringify(report.summary));console.log(md.join('\n'))}
main().catch(async e=>{await dirs();report.fatal=String(e.stack||e);await writeFile(path.join(OUT,'report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1})
