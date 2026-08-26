import Link from 'next/link'

const qaHost='kingdom-network-git-preview-packa-81e01d-tmak209-6568s-projects.vercel.app'
const leaders=[
  ['Abraham Jimenez','p1.fgleader.abraham.jimenez@kingdomnetwork.test'],
  ['Adolfo Cruz','p1.fgleader.adolfo.cruz@kingdomnetwork.test'],
  ['Erica Jimenez','p1.fgleader.erica.jimenez@kingdomnetwork.test'],
  ['Felipe Chavez','p1.fgleader.felipe.chavez@kingdomnetwork.test'],
  ['Fidel Martinez','p1.fgleader.fidel.martinez@kingdomnetwork.test'],
  ['Ishmael Adame','p1.fgleader.ishmael.adame@kingdomnetwork.test'],
  ['Jacob Mejia','p1.fgleader.jacob.mejia@kingdomnetwork.test'],
  ['Jessica Kelting','p1.fgleader.jessica.kelting@kingdomnetwork.test'],
  ['Lourdes Martinez','p1.fgleader.lourdes.martinez@kingdomnetwork.test'],
  ['Marcus Kelting','p1.fgleader.marcus.kelting@kingdomnetwork.test'],
  ['Maricela Mejia','p1.fgleader.maricela.mejia@kingdomnetwork.test'],
  ['Santa Chaves','p1.fgleader.santa.chaves@kingdomnetwork.test'],
  ['Sophie Adame','p1.fgleader.sophie.adame@kingdomnetwork.test'],
  ['Susana Cruz','p1.fgleader.susana.cruz@kingdomnetwork.test']
] as const

export default function Package1QaPage(){return <main style={{maxWidth:760,margin:'0 auto',padding:'28px 18px 96px',fontFamily:'system-ui,sans-serif'}}>
  <section style={{border:'2px solid #b68b00',borderRadius:18,padding:22,background:'#fffdf4'}}>
    <div style={{fontWeight:900,fontSize:13,letterSpacing:'.08em'}}>PACKAGE 1 PHONE QA • PRUEBA QA</div>
    <h1 style={{margin:'8px 0 10px'}}>Friendship Group Leader Test</h1>
    <p style={{fontWeight:700}}>This is an isolated test site. It is NOT the live church app and contains no real church data.</p>
    <p><strong>Safety check:</strong> after Vercel opens the test, your browser address must stay on <code>{qaHost}</code>. If you ever see <code>kingdom-network.vercel.app</code>, stop and report it.</p>
    <hr style={{margin:'22px 0'}}/>
    <h2>English</h2>
    <ol style={{lineHeight:1.6}}>
      <li>Find your name in the tester list below and copy your QA email.</li>
      <li>Tap <strong>Begin test</strong>, choose <strong>Create account</strong>, and use that QA email.</li>
      <li>Create a temporary password of at least 8 characters. Do not use a password you use anywhere else.</li>
      <li>Use your real first/last name for the tester account, but use <strong>fake guest, prayer and report information</strong> everywhere else.</li>
      <li>Complete Start Here, open Friendship Groups, enter your QA group, and test leader tools, sharing/connect, follow-up and one Friendship Group report.</li>
      <li>Keep watching the yellow QA banner and the browser address. The test must never leave this QA preview.</li>
    </ol>
    <h2>Español</h2>
    <ol style={{lineHeight:1.6}}>
      <li>Busque su nombre en la lista de probadores abajo y copie su correo QA.</li>
      <li>Toque <strong>Comenzar prueba</strong>, elija <strong>Crear cuenta</strong> y use ese correo QA.</li>
      <li>Cree una contraseña temporal de por lo menos 8 caracteres. No use una contraseña que utilice en otro lugar.</li>
      <li>Use su nombre y apellido reales para la cuenta de prueba, pero use <strong>información falsa para invitados, oración e informes</strong>.</li>
      <li>Complete Empieza Aquí, abra Grupos de Amistad, entre a su grupo QA y pruebe las herramientas del líder, compartir/conectar, seguimiento y un informe de GDA.</li>
      <li>Observe siempre la barra amarilla QA y la dirección del navegador. La prueba nunca debe salir de este sitio QA.</li>
    </ol>
    <h2 style={{marginTop:28}}>Tester accounts • Cuentas de prueba</h2>
    <div style={{display:'grid',gap:8}}>{leaders.map(([name,email])=><div key={email} style={{padding:'10px 12px',border:'1px solid #d8c98f',borderRadius:10,background:'white'}}><strong>{name}</strong><br/><code style={{fontSize:12,wordBreak:'break-all'}}>{email}</code></div>)}</div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:24}}>
      <Link href="/login?mode=signup&lang=en" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,background:'#15264a',color:'white',fontWeight:800,textDecoration:'none'}}>Begin test</Link>
      <Link href="/login?mode=signup&lang=es" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,border:'1px solid #15264a',color:'#15264a',fontWeight:800,textDecoration:'none'}}>Comenzar prueba</Link>
    </div>
  </section>
</main>}
