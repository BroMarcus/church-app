import Script from 'next/script'

export function InstallPromptCapture(){
  return <Script id="one-kingdom-install-capture" strategy="beforeInteractive">{`
    window.__oneKingdomInstallPrompt = window.__oneKingdomInstallPrompt || null;
    window.addEventListener('beforeinstallprompt', function(event) {
      event.preventDefault();
      window.__oneKingdomInstallPrompt = event;
      window.dispatchEvent(new Event('onekingdominstallready'));
    });
    window.addEventListener('appinstalled', function() {
      window.__oneKingdomInstallPrompt = null;
    });
  `}</Script>
}
