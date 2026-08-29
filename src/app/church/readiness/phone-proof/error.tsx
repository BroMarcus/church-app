'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import './phone-proof.css'

type Lang = 'en' | 'es'

const copy = {
  en: {
    pill: 'PHONE PROOF',
    title: 'We could not verify the phone-test station',
    body: 'This may be a temporary connection or account-check problem. Nothing was changed and no test result was lost from this page. Try again before recording PASS or FAIL.',
    retry: 'Try Phone Proof again',
    readiness: 'Back to Pilot Readiness',
    signIn: 'Sign in again',
  },
  es: {
    pill: 'PRUEBA EN TELÉFONO',
    title: 'No pudimos verificar la estación de prueba',
    body: 'Puede ser un problema temporal de conexión o verificación de cuenta. No se cambió nada y esta página no borró resultados de prueba. Inténtalo otra vez antes de registrar PASÓ o FALLÓ.',
    retry: 'Intentar Phone Proof otra vez',
    readiness: 'Volver a Preparación del Piloto',
    signIn: 'Iniciar sesión otra vez',
  },
} as const

function currentLanguage(): Lang {
  if (typeof window === 'undefined') return 'en'
  const requested = new URLSearchParams(window.location.search).get('lang')
  if (requested === 'es') return 'es'
  if (requested === 'en') return 'en'
  return document.documentElement.lang.toLowerCase().startsWith('es') ? 'es' : 'en'
}

export default function PhoneProofError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [lang, setLang] = useState<Lang>('en')

  useEffect(() => {
    setLang(currentLanguage())
  }, [])

  const t = copy[lang]
  const langQuery = `?lang=${lang}`

  return (
    <main className="phone-proof-shell">
      <section className="local-note" role="alert" aria-live="assertive">
        <div className="pill">{t.pill}</div>
        <h1>{t.title}</h1>
        <p>{t.body}</p>
        <div className="proof-actions">
          <button type="button" className="primary" onClick={reset}>{t.retry}</button>
        </div>
        <div className="proof-links">
          <Link href={`/church/readiness${langQuery}`}>{t.readiness}</Link>
          <Link href={`/login${langQuery}&mode=signin`}>{t.signIn}</Link>
        </div>
      </section>
    </main>
  )
}
