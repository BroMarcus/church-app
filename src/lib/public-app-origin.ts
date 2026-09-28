export const PUBLIC_APP_ORIGIN=(process.env.NEXT_PUBLIC_PUBLIC_APP_ORIGIN||'https://one-kingdom.com').replace(/\/$/,'')

export function publicAppUrl(path=''){
  if(!path)return PUBLIC_APP_ORIGIN
  return `${PUBLIC_APP_ORIGIN}${path.startsWith('/')?path:`/${path}`}`
}
