import { Resend } from 'resend'

console.log('[Email Boot] RESEND_API_KEY presente ?', !!process.env.RESEND_API_KEY)
console.log('[Email Boot] prefixe :', process.env.RESEND_API_KEY?.slice(0, 6) || 'VIDE')

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM || 'LocalSud <noreply@localsud.fr>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendInvitationEmail(opts: { to: string; clientName: string; setupToken: string }) {
  console.log('[Email] Appel sendInvitationEmail pour:', opts.to)
  console.log('[Email] resend instance ?', !!resend)

  if (!resend) {
    console.warn('[Email] Resend NON configure, abandon pour:', opts.to)
    return
  }

  const setupUrl = APP_URL + '/setup?token=' + opts.setupToken

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: 'Bienvenue chez LocalSud',
      html: '<p>Bonjour ' + opts.clientName + ', cliquez ici : <a href="' + setupUrl + '">' + setupUrl + '</a></p>',
    })
    console.log('[Email] Resultat envoi :', JSON.stringify(result))
  } catch (err: any) {
    console.error('[Email] Erreur envoi :', err.message, err)
  }
}

export async function sendResetPasswordEmail(opts: { to: string; name?: string | null; resetToken: string }) {
  if (!resend) {
    console.warn('[Email] Resend NON configure pour reset:', opts.to)
    return
  }
  const url = APP_URL + '/reset?token=' + opts.resetToken
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: 'Reset mot de passe LocalSud',
      html: '<p>Bonjour ' + (opts.name || '') + ', cliquez ici pour reset : <a href="' + url + '">' + url + '</a></p>',
    })
    console.log('[Email] Reset envoye :', JSON.stringify(result))
  } catch (err: any) {
    console.error('[Email] Erreur reset :', err.message)
  }
}
