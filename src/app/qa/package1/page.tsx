import Link from 'next/link'

const qaHost='kingdom-network-git-preview-packa-81e01d-tmak209-6568s-projects.vercel.app'

export default function Package1QaPage(){return <main style={{maxWidth:720,margin:'0 auto',padding:'28px 18px 96px',fontFamily:'system-ui,sans-serif'}}>
  <section style={{border:'2px solid #b68b00',borderRadius:18,padding:22,background:'#fffdf4'}}>
    <div style={{fontWeight:900,fontSize:13,letterSpacing:'.08em'}}>PACKAGE 1 PHONE QA • PRUEBA QA</div>
    <h1 style={{margin:'8px 0 10px'}}>Friendship Group Leader Test</h1>
    <p style={{fontWeight:700}}>This is an isolated test site. It is NOT the live church app and contains no real church data.</p>
    <p><strong>Safety check:</strong> after Vercel opens the test, your browser address must stay on <code>{qaHost}</code>. If you ever see <code>kingdom-network.vercel.app</code>, stop and report it.</p>
    <hr style={{margin:'22px 0'}}/>
    <h2>English</h2>
    <ol style={{lineHeight:1.6}}>
      <li>Tap <strong>Begin test</strong> below, then choose <strong>Create account</strong>.</li>
      <li>Use a fake QA email in this format: <code>p1.fgleader.firstname.lastname@kingdomnetwork.test</code>. Use lowercase letters only; remove spaces, apostrophes and accents.</li>
      <li>Create a temporary password of at least 8 characters. Do not use a password you use anywhere else.</li>
      <li>Use your real first/last name for the tester account, but use <strong>fake guest, prayer and report information</strong> everywhere else.</li>
      <li>Complete Start Here, open Friendship Groups, enter your QA group, and test leader tools, sharing/connect, follow-up and one Friendship Group report.</li>
      <li>Keep watching the yellow QA banner and the browser address. The test must never leave this QA preview.</li>
    </ol>
    <h2>Español</h2>
    <ol style={{lineHeight:1.6}}>
      <li>Toque <strong>Comenzar prueba</strong> abajo y después elija <strong>Crear cuenta</strong>.</li>
      <li>Use un correo falso de QA con este formato: <code>p1.fgleader.nombre.apellido@kingdomnetwork.test</code>. Use letras minúsculas; quite espacios, apóstrofes y acentos.</li>
      <li>Cree una contraseña temporal de por lo menos 8 caracteres. No use una contraseña que utilice en otro lugar.</li>
      <li>Use su nombre y apellido reales para la cuenta de prueba, pero use <strong>información falsa para invitados, oración e informes</strong>.</li>
      <li>Complete Empieza Aquí, abra Grupos de Amistad, entre a su grupo QA y pruebe las herramientas del líder, compartir/conectar, seguimiento y un informe de GDA.</li>
      <li>Observe siempre la barra amarilla QA y la dirección del navegador. La prueba nunca debe salir de este sitio QA.</li>
    </ol>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:24}}>
      <Link href="/login?mode=signup&lang=en" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,background:'#15264a',color:'white',fontWeight:800,textDecoration:'none'}}>Begin test</Link>
      <Link href="/login?mode=signup&lang=es" style={{display:'inline-block',padding:'12px 18px',borderRadius:10,border:'1px solid #15264a',color:'#15264a',fontWeight:800,textDecoration:'none'}}>Comenzar prueba</Link>
    </div>
  </section>
</main>}
