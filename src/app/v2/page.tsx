'use client'

import { useState } from 'react'
import styles from './v2-foundation.module.css'

type Lang='en'|'es'

const copy={
  en:{
    label:'STEP 1 · FOUNDATION',
    title:'Kingdom Network V2 is being built beside V1 — not on top of it.',
    intro:'This review area exists so we can finish one section at a time, prove it works, and get your approval before moving forward.',
    safety:'V1 remains protected. This V2 foundation does not write to real church records and it does not replace production.',
    statusTitle:'Foundation decisions',
    statusSub:'These are the rules currently locked for V2.',
    cards:[
      ['V1 protected','V2 work stays isolated unless a future V1 change is specifically approved.','Locked'],
      ['Separate V2 branch','Development lives on the long-lived kingdom-network-v2 branch under /v2.','Locked'],
      ['Real data is read-only','Authorized real church data may be viewed later, but live records are not edited until that write workflow is tested and approved.','Locked'],
      ['Test writes first','Create/edit/delete testing uses clearly labeled test users and test records before live-write approval.','Locked'],
      ['Mobile + bilingual','Every major section is designed mobile-first and built in English and Spanish together.','Locked'],
      ['Preview before approval','Related changes are reviewed in isolated preview batches. A section is not finished until Marcus approves it.','Locked']
    ],
    visualTitle:'Visual foundation',
    visualSub:'Blue/gold is isolated to V2 and built with replaceable design tokens.',
    visualBody:'The exact earlier Claude palette is not preserved in the available project material, so these colors are intentionally provisional. The structure makes it easy to swap the exact blue/gold palette — or return to the original V1 look — without rebuilding feature logic.',
    next:'STEP 1 GATE',
    gateTitle:'Navigation must be agreed before feature building starts.',
    gateBody:'We have not built Home, Learning, Groups, Finance, AI, or any other real feature. The next decision inside Step 1 is the permanent top-level V2 navigation. We stay here until that is approved.',
    footer:'Kingdom Network V2 · Foundation review only · Production unchanged'
  },
  es:{
    label:'PASO 1 · FUNDACIÓN',
    title:'Kingdom Network V2 se está construyendo al lado de V1 — no encima de V1.',
    intro:'Esta área de revisión existe para que terminemos una sección a la vez, comprobemos que funciona y obtengamos tu aprobación antes de seguir adelante.',
    safety:'V1 permanece protegido. Esta fundación de V2 no escribe en registros reales de la iglesia y no reemplaza producción.',
    statusTitle:'Decisiones de la fundación',
    statusSub:'Estas son las reglas actualmente establecidas para V2.',
    cards:[
      ['V1 protegido','El trabajo de V2 permanece aislado a menos que un cambio futuro en V1 sea aprobado específicamente.','Fijado'],
      ['Rama V2 separada','El desarrollo vive en la rama permanente kingdom-network-v2 bajo /v2.','Fijado'],
      ['Datos reales solo lectura','Más adelante se podrán ver datos reales autorizados de la iglesia, pero no se editarán registros reales hasta que ese flujo de escritura sea probado y aprobado.','Fijado'],
      ['Primero probar escrituras','Las pruebas de crear, editar y borrar usan usuarios y registros de prueba claramente identificados antes de aprobar escrituras reales.','Fijado'],
      ['Móvil + bilingüe','Cada sección principal se diseña primero para teléfono y se construye en inglés y español al mismo tiempo.','Fijado'],
      ['Vista previa antes de aprobar','Los cambios relacionados se revisan en grupos mediante una vista previa aislada. Una sección no está terminada hasta que Marcus la apruebe.','Fijado']
    ],
    visualTitle:'Fundación visual',
    visualSub:'El estilo azul/dorado está aislado en V2 y usa variables de diseño reemplazables.',
    visualBody:'La paleta exacta anterior de Claude no está preservada en el material disponible del proyecto, así que estos colores son provisionales a propósito. La estructura permite cambiar fácilmente a la paleta azul/dorada exacta — o regresar al estilo original de V1 — sin reconstruir la lógica de las funciones.',
    next:'PUERTA DEL PASO 1',
    gateTitle:'La navegación debe acordarse antes de comenzar a construir funciones.',
    gateBody:'No hemos construido Inicio, Aprendizaje, Grupos, Finanzas, IA ni ninguna otra función real. La próxima decisión dentro del Paso 1 es la navegación principal permanente de V2. Nos quedamos aquí hasta que sea aprobada.',
    footer:'Kingdom Network V2 · Solo revisión de fundación · Producción sin cambios'
  }
} as const

export default function V2FoundationPage(){
  const [lang,setLang]=useState<Lang>('en')
  const t=copy[lang]
  return <main className={styles.page}>
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <strong>Kingdom Network V2</strong>
        <span>Connect · Equip · Empower</span>
      </div>
      <div className={styles.language} aria-label="Language">
        <button type="button" className={lang==='en'?styles.active:''} onClick={()=>setLang('en')} aria-pressed={lang==='en'}>EN</button>
        <button type="button" className={lang==='es'?styles.active:''} onClick={()=>setLang('es')} aria-pressed={lang==='es'}>ES</button>
      </div>
    </header>

    <section className={styles.hero}>
      <span className={styles.eyebrow}>{t.label}</span>
      <h1>{t.title}</h1>
      <p>{t.intro}</p>
      <div className={styles.notice}><span className={styles.noticeDot}/><span>{t.safety}</span></div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>{t.statusTitle}</h2>
        <p>{t.statusSub}</p>
      </div>
      <div className={styles.grid}>
        {t.cards.map(([title,body,status])=><article className={styles.card} key={title}>
          <div className={styles.cardTop}><strong>{title}</strong><span className={styles.status}>{status}</span></div>
          <p>{body}</p>
        </article>)}
      </div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>{t.visualTitle}</h2>
        <p>{t.visualSub}</p>
      </div>
      <article className={styles.card}>
        <p>{t.visualBody}</p>
      </article>
    </section>

    <section className={styles.gate}>
      <span className={styles.eyebrow}>{t.next}</span>
      <strong>{t.gateTitle}</strong>
      <p>{t.gateBody}</p>
    </section>

    <footer className={styles.footer}>{t.footer}</footer>
  </main>
}
