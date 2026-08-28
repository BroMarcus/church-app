'use client'

import Link from 'next/link'
import {useEffect,useState} from 'react'

const resolveRecoveryLanguage=(): 'en'|'es' => {
  const requested=new URLSearchParams(window.location.search).get('lang')
  if(requested==='es')return 'es'
  if(requested==='en')return 'en'
  if(document.documentElement.lang.toLowerCase().startsWith('es'))return 'es'
  const browserLanguages=Array.isArray(navigator.languages)&&navigator.languages.length?navigator.languages:[navigator.language]
  return browserLanguages.some(value=>String(value||'').toLowerCase().startsWith('es'))?'es':'en'
}

export default function NotFound(){
  const [lang,setLang]=useState<'en'|'es'>('en')

  useEffect(()=>{
    const selected=resolveRecoveryLanguage()
    setLang(selected)
    document.documentElement.lang=selected
  },[])

  const es=lang==='es'
  const t=(en:string,sp:string)=>es?sp:en
  const home=`/?lang=${lang}`
  const signIn=`/login?mode=signin&lang=${lang}`
  const selectLanguage=(next:'en'|'es')=>{
    setLang(next)
    document.documentElement.lang=next
    const url=new URL(window.location.href)
    url.searchParams.set('lang',next)
    window.history.replaceState(window.history.state,'',`${url.pathname}${url.search}${url.hash}`)
  }

  return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 18px 80px'}}>
    <div className="card" style={{padding:24}}>
      <div className="pill">KINGDOM NETWORK</div>
      <h1 style={{margin:'10px 0 8px'}}>{t('We could not find that page','No encontramos esa página')}</h1>
      <p className="muted" style={{lineHeight:1.6,marginBottom:8}}>{t('The link may be old, incomplete, or typed incorrectly. Your account and church information were not changed.','El enlace puede ser antiguo, estar incompleto o haberse escrito incorrectamente. Tu cuenta y la información de tu iglesia no fueron modificadas.')}</p>
      <p className="muted" style={{lineHeight:1.6,marginTop:0}}>{t('If this came from a church invitation, use the newest invitation or join link your church sent you.','Si esto vino de una invitación de tu iglesia, usa la invitación o el enlace más reciente que te enviaron.')}</p>
      <div className="row" style={{gap:10,flexWrap:'wrap',marginTop:18}}>
        <Link className="btn" href={home}>{t('Home','Inicio')}</Link>
        <Link className="ghost" href={signIn}>{t('Sign in','Iniciar sesión')}</Link>
      </div>
      <div className="row" style={{gap:8,marginTop:18,flexWrap:'wrap'}} aria-label={t('Language','Idioma')}>
        <button type="button" onClick={()=>selectLanguage('en')} aria-pressed={!es} className="ghost">English</button>
        <button type="button" onClick={()=>selectLanguage('es')} aria-pressed={es} className="ghost">Español</button>
      </div>
    </div>
  </main>
}