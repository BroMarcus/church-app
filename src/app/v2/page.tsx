'use client'

import { useMemo,useState } from 'react'
import { LayoutPanelTop,Palette,ShieldCheck,SlidersHorizontal } from 'lucide-react'
import { V2BrandLockup } from './v2-brand-lockup'
import { DEFAULT_V2_TABS,V2BottomNav,type V2Lang,type V2NavTab } from './v2-bottom-nav'
import styles from './v2-foundation.module.css'

const colors=[
  ['navy-900','#0A1730'],['navy-850','#0E1D3E'],['navy-800','#152A4C'],['navy-700','#1D3563'],
  ['gold-400','#E3C179'],['gold-500','#C9A253'],['gold-600','#9C7B37'],
  ['ink-100','#F5F1E6'],['ink-300','#C6CEE0'],['ink-500','#8894B4']
] as const

const copy={
  en:{
    label:'STEP 1 · FOUNDATION',
    title:'The V2 navigation and design system are now locked for review.',
    intro:'Claude’s strongest Step 1 ideas are now reconciled with our rules: five permanent member tabs, exact blue-and-gold tokens, fixed Kingdom Network branding, mobile-first behavior, and English/Spanish together.',
    safety:'V1 remains protected. No Home, Groups, Learning, Serve, Finance, AI, Supabase schema, or real church record was changed in this batch.',
    section:'What changed',
    sectionSub:'Only Step 1 foundation work was implemented.',
    cards:[
      ['Five-tab navigation','Home · My Group · Learn · Serve · More is now the approved default member navigation.','Locked'],
      ['Config-driven tabs','The navigation component accepts a five-tab configuration so future per-user destinations can be stored without rebuilding the shell.','Ready'],
      ['Exact visual tokens','Claude’s literal navy, gold, and ink values are now the single V2 source of truth.','Locked'],
      ['Exact typography','Cormorant Garamond 600 is used for titles; Work Sans 400/500/600 is used for body and UI.','Locked'],
      ['Branding lockup','KINGDOM NETWORK stays fixed above the church name. Church-specific branding remains secondary.','Locked'],
      ['Feature discipline','The Groups screens and real data changes from Claude’s brief are preserved for the Friendship Groups step, not built early.','Protected']
    ],
    paletteTitle:'Locked V2 palette',
    paletteSub:'These are the exact values now used by the V2 theme.',
    previewTitle:'Navigation prototype',
    previewSub:'Tap a bottom tab to inspect the permanent navigation behavior without creating unfinished feature pages.',
    selected:(label:string)=>`${label} is reserved in the permanent navigation. Its real screen will be built only when we reach that approved step.`,
    gate:'STEP 1 REVIEW',
    gateTitle:'Foundation revision is ready for your approval.',
    gateBody:'The navigation gate is now settled. We still stay in Step 1 until you personally approve this preview. After approval, we will decide the next V2 section and run its focused 10–20 question discovery before building it.',
    footer:'Kingdom Network V2 · Foundation review · Production unchanged'
  },
  es:{
    label:'PASO 1 · FUNDACIÓN',
    title:'La navegación y el sistema visual de V2 ya están fijados para revisión.',
    intro:'Las mejores ideas de Claude para el Paso 1 ya están reconciliadas con nuestras reglas: cinco pestañas permanentes, colores azul y dorado exactos, marca fija de Kingdom Network, diseño primero para móvil e inglés/español juntos.',
    safety:'V1 permanece protegido. En este grupo de cambios no se modificaron Inicio, Grupos, Aprendizaje, Servir, Finanzas, IA, el esquema de Supabase ni registros reales de la iglesia.',
    section:'Qué cambió',
    sectionSub:'Solo se implementó trabajo de fundación del Paso 1.',
    cards:[
      ['Navegación de cinco pestañas','Inicio · Mi Grupo · Aprender · Servir · Más es ahora la navegación predeterminada aprobada para miembros.','Fijado'],
      ['Pestañas configurables','El componente acepta una configuración de cinco pestañas para que más adelante cada usuario pueda guardar destinos sin reconstruir la navegación.','Listo'],
      ['Colores exactos','Los valores literales azul marino, dorado y tinta de Claude son ahora la única fuente visual de V2.','Fijado'],
      ['Tipografía exacta','Cormorant Garamond 600 se usa para títulos; Work Sans 400/500/600 para cuerpo e interfaz.','Fijado'],
      ['Marca fija','KINGDOM NETWORK permanece fijo sobre el nombre de la iglesia. La marca de cada iglesia sigue siendo secundaria.','Fijado'],
      ['Disciplina de funciones','Las pantallas de Grupos y cambios de datos del documento de Claude quedan guardados para el paso de Grupos de Amistad, no se construyen antes de tiempo.','Protegido']
    ],
    paletteTitle:'Paleta V2 fijada',
    paletteSub:'Estos son los valores exactos que ahora usa el tema V2.',
    previewTitle:'Prototipo de navegación',
    previewSub:'Toca una pestaña inferior para revisar la navegación permanente sin crear pantallas incompletas.',
    selected:(label:string)=>`${label} está reservado en la navegación permanente. Su pantalla real se construirá solamente cuando lleguemos a ese paso aprobado.`,
    gate:'REVISIÓN DEL PASO 1',
    gateTitle:'La revisión de la fundación está lista para tu aprobación.',
    gateBody:'La decisión de navegación ya está resuelta. Seguimos en el Paso 1 hasta que tú apruebes personalmente esta vista previa. Después de aprobarla, decidiremos la próxima sección de V2 y haremos sus 10–20 preguntas enfocadas antes de construirla.',
    footer:'Kingdom Network V2 · Revisión de fundación · Producción sin cambios'
  }
} as const

const iconCards=[Palette,LayoutPanelTop,SlidersHorizontal,ShieldCheck,LayoutPanelTop,ShieldCheck]

export default function V2FoundationPage(){
  const [lang,setLang]=useState<V2Lang>('en')
  const [activeTab,setActiveTab]=useState<V2NavTab>(DEFAULT_V2_TABS[0])
  const t=copy[lang]
  const activeLabel=useMemo(()=>activeTab.label[lang],[activeTab,lang])

  return <>
    <main className={styles.page}>
      <header className={styles.topbar}>
        <V2BrandLockup churchName="Madera New Life Apostolic Church"/>
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
        <div className={styles.sectionHead}><h2>{t.section}</h2><p>{t.sectionSub}</p></div>
        <div className={styles.grid}>
          {t.cards.map(([title,body,status],index)=>{const Icon=iconCards[index];return <article className={styles.card} key={title}>
            <span className={styles.iconTile}><Icon size={20} strokeWidth={1.75} aria-hidden="true"/></span>
            <div className={styles.cardTop}><strong>{title}</strong><span className={styles.status}>{status}</span></div>
            <p>{body}</p>
          </article>})}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>{t.paletteTitle}</h2><p>{t.paletteSub}</p></div>
        <div className={styles.swatches}>{colors.map(([name,value])=><div className={styles.swatch} key={name}>
          <div className={styles.swatchColor} style={{background:value}}/>
          <div className={styles.swatchCopy}><strong>{name}</strong><span>{value}</span></div>
        </div>)}</div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2>{t.previewTitle}</h2><p>{t.previewSub}</p></div>
        <article className={`${styles.card} ${styles.navPreview}`}>
          <span className={styles.iconTile}><activeTab.Icon size={20} strokeWidth={1.75} aria-hidden="true"/></span>
          <div className={styles.navPreviewCopy}><strong>{activeLabel}</strong><p>{t.selected(activeLabel)}</p></div>
        </article>
      </section>

      <section className={styles.gate}>
        <span className={styles.eyebrow}>{t.gate}</span>
        <strong>{t.gateTitle}</strong>
        <p>{t.gateBody}</p>
      </section>

      <footer className={styles.footer}>{t.footer}</footer>
    </main>
    <V2BottomNav lang={lang} activeId={activeTab.id} tabs={DEFAULT_V2_TABS} onSelect={setActiveTab}/>
  </>
}
