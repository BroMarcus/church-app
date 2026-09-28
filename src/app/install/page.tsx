import Link from 'next/link'
import { InstallClient } from './install-client'

export default async function InstallPage({searchParams}:{searchParams:Promise<{lang?:string}>}){
  const params=await searchParams
  const lang=params.lang==='es'?'es':'en'
  const es=lang==='es'
  return <main className="shell" style={{maxWidth:720}}>
    <header className="topbar"><div><Link href="/" className="brand">Kingdom <span>Network</span></Link><div className="small muted">{es?'Agregar al teléfono':'Add to Phone'}</div></div><div className="row"><Link className="ghost" href="/install?lang=en">English</Link><Link className="ghost" href="/install?lang=es">Español</Link></div></header>
    <section className="card" style={{padding:24,marginBottom:16}}><div className="pill">1K • {es?'ACCESO RÁPIDO':'QUICK ACCESS'}</div><h1>{es?'Agrega One Kingdom a tu teléfono':'Add One Kingdom to your phone'}</h1><p className="muted">{es?'Esto es opcional. No crea otra cuenta y no cambia tus datos. Solo coloca un icono 1K en tu pantalla de inicio para abrir One Kingdom más rápido.':'This is optional. It does not create another account or change your data. It simply puts a 1K icon on your Home Screen so One Kingdom opens faster.'}</p></section>
    <InstallClient lang={lang}/>
    <div className="row" style={{marginTop:16}}><Link className="ghost" href={es?'/?lang=es':'/'}>{es?'← Volver a Inicio':'← Back to Home'}</Link></div>
  </main>
}
