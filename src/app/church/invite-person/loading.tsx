'use client'

import {useEffect,useState} from 'react'
type Lang='en'|'es'
const copy={en:{pill:'PRIVATE INVITATION',title:'Checking invitation access…',body:'Keep this page open while we verify your church access and invitation tools. Nothing is being created or changed.'},es:{pill:'INVITACIÓN PRIVADA',title:'Verificando el acceso para invitar…',body:'Mantén esta página abierta mientras verificamos tu acceso de iglesia y las herramientas de invitación. No se está creando ni cambiando nada.'}} as const
function currentLanguage():Lang{if(typeof window==='undefined')return'en';const requested=new URLSearchParams(window.location.search).get('lang');if(requested==='es')return'es';if(requested==='en')return'en';return document.documentElement.lang.toLowerCase().startsWith('es')?'es':'en'}
export default function InvitePersonLoading(){const[lang,setLang]=useState<Lang>('en');useEffect(()=>setLang(currentLanguage()),[]);const t=copy[lang];return <main className="shell" aria-busy="true"><section className="card" role="status" aria-live="polite" style={{padding:26,marginTop:24,maxWidth:760}}><div className="pill">{t.pill}</div><h1>{t.title}</h1><p className="muted">{t.body}</p></section></main>}
