'use client'

import { useEffect,useMemo,useState } from 'react'

type DeferredInstallPrompt=Event&{
  prompt:()=>Promise<void>
  userChoice:Promise<{outcome:'accepted'|'dismissed';platform:string}>
}

declare global{
  interface Window{
    __oneKingdomInstallPrompt?:DeferredInstallPrompt|null
  }
}

export function InstallClient({lang}:{lang:'en'|'es'}){
  const es=lang==='es'
  const [ready,setReady]=useState(false)
  const [installed,setInstalled]=useState(false)
  const [ua,setUa]=useState('')

  useEffect(()=>{
    const sync=()=>{
      setReady(Boolean(window.__oneKingdomInstallPrompt))
      const standalone=window.matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone)
      setInstalled(standalone)
      setUa(navigator.userAgent)
    }
    const onInstalled=()=>{window.__oneKingdomInstallPrompt=null;setInstalled(true);setReady(false)}
    sync()
    window.addEventListener('onekingdominstallready',sync)
    window.addEventListener('appinstalled',onInstalled)
    return()=>{window.removeEventListener('onekingdominstallready',sync);window.removeEventListener('appinstalled',onInstalled)}
  },[])

  const device=useMemo(()=>{
    const ios=/iPhone|iPad|iPod/i.test(ua)
    const android=/Android/i.test(ua)
    const safari=ios&&!/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
    return {ios,android,safari}
  },[ua])

  async function install(){
    const prompt=window.__oneKingdomInstallPrompt
    if(!prompt)return
    await prompt.prompt()
    await prompt.userChoice
    window.__oneKingdomInstallPrompt=null
    setReady(false)
  }

  if(installed)return <div className="notice success" role="status"><strong>{es?'One Kingdom ya está agregado a este dispositivo.':'One Kingdom is already added to this device.'}</strong><div className="small" style={{marginTop:5}}>{es?'Ábrelo desde el icono 1K en tu pantalla de inicio.':'Open it from the 1K icon on your Home Screen.'}</div></div>

  if(device.ios)return <div className="card" style={{padding:18}}>
    <h2 style={{marginTop:0}}>{es?'iPhone / iPad':'iPhone / iPad'}</h2>
    {!device.safari&&<div className="notice">{es?'Primero abre One Kingdom en Safari. Los navegadores integrados y otros navegadores de iPhone no siempre muestran la opción correcta.':'First open One Kingdom in Safari. Embedded browsers and other iPhone browsers may not show the correct Home Screen option.'}</div>}
    <ol style={{lineHeight:1.8,paddingLeft:22}}>
      <li>{es?'Abre esta página en Safari.':'Open this page in Safari.'}</li>
      <li>{es?'Toca Compartir (el cuadro con la flecha hacia arriba).':'Tap Share (the square with the up arrow).'}</li>
      <li>{es?'Desliza y toca “Agregar a pantalla de inicio”.':'Scroll and tap “Add to Home Screen”.'}</li>
      <li>{es?'Toca “Agregar”.':'Tap “Add”.'}</li>
    </ol>
  </div>

  if(device.android)return <div className="card" style={{padding:18}}>
    <h2 style={{marginTop:0}}>{es?'Android':'Android'}</h2>
    {ready?<><p className="muted">{es?'Tu navegador está listo para instalar One Kingdom.':'Your browser is ready to install One Kingdom.'}</p><button className="btn" type="button" onClick={install}>{es?'Instalar One Kingdom':'Install One Kingdom'}</button></>:<><p className="muted">{es?'Si no aparece el botón de instalación, abre esta página en Chrome y usa el menú ⋮ → “Instalar aplicación” o “Agregar a pantalla principal”.':'If the install button is not available, open this page in Chrome and use menu ⋮ → “Install app” or “Add to Home screen”.'}</p><div className="notice">{es?'Si estás dentro de Facebook, Mensajes u otro navegador integrado, usa “Abrir en Chrome” primero.':'If you are inside Facebook, Messages, or another embedded browser, choose “Open in Chrome” first.'}</div></>}
  </div>

  return <div className="card" style={{padding:18}}>
    <h2 style={{marginTop:0}}>{es?'Agregar One Kingdom':'Add One Kingdom'}</h2>
    {ready?<button className="btn" type="button" onClick={install}>{es?'Instalar One Kingdom':'Install One Kingdom'}</button>:<p className="muted">{es?'Usa el menú de tu navegador y busca “Instalar aplicación” o “Agregar a pantalla de inicio”.':'Use your browser menu and look for “Install app” or “Add to Home screen”.'}</p>}
  </div>
}
