'use client'

import {useEffect,useState} from 'react'
type Lang='en'|'es'
const copy={en:{pill:'JOIN CENTER',title:'Checking Join Center…',body:'Keep this page open while we verify church access and signup status. Nothing is being changed.'},es:{pill:'CENTRO DE INGRESO',title:'Verificando el Centro de Ingreso…',body:'Mantén esta página abierta mientras verificamos el acceso de la iglesia y el estado del registro. No se está cambiando nada.'}} as const
function currentLanguage():Lang{if(typeof window==='undefined')return'en';const requested=new URLSearchParams(window.location.search).get('lang');if(requested==='es')return'es';if(requested==='en')return'en';return document.documentElement.lang.toLowerCase().startsWith('es')?'es':'en'}
export default function JoinCenterLoading(){const[lang,setLang]=useState<Lang>('en');useEffect(()=>setLang(currentLanguage()),[]);const t=copy[lang];return <main className="shell" aria-busy="true"><section className="card" role="status" aria-live="polite" style={{padding:26,marginTop:24,maxWidth:760}}><div className="pill">{t.pill}</div><h1>{t.title}</h1><p className="muted">{t.body}</p></section></main>}
