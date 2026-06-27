import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM || 'LocalSud <noreply@localsud.fr>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

function emailLayout(opts: { title: string; intro: string; ctaLabel: string; ctaUrl: string; footer?: string }) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#F7F8FC;margin:0;padding:40px 20px">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;border:1px solid #E7EAF3">
    <div style="background:#0B1F4D;color:white;padding:36px 32px;text-align:center">
      <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em">Local<span style="color:#FFCB3D">Sud</span></div>
      <h1 style="margin:18px 0 6px;font-size:22px;font-weight:700">${opts.title}</h1>
    </div>
    <div style="padding:32px">
      <div style="font-size:15px;line-height:1.6;color:#4A5680;margin-bottom:24px">${opts.intro}</div>
      <div style="text-align:center;margin:30px 0">
        <a href="${opts.ctaUrl}" style="display:inline-block;background:#FFCB3D;color:#0B1F4D;padding:14px 32px;border-radius:100px;font-weight:700;text-decoration:none;font-size:15px">${opts.ctaLabel}</a>
      </div>
      <p style="font-size:12px;color:#8B95B0;text-align:center;margin-top:24px">Ou copiez ce lien dans votre navigateur :<br><span style="color:#0B1F4D;word-break:break-all">${opts.ctaUrl}</span></p>
      ${opts.footer ? '<p style="font-size:12px;color:#8B95B0;text-align:center;margin-top:24px">' + opts.footer + '</p>' : ''}
    </div>
    <div style="background:#F7F8FC;padding:18px;text-align:center;font-size:12px;color:#8B95B0">© LocalSud — Création de sites web pour les pros</div>
  </div>
</body></html>`
}

export async function sendInvitationEmail(opts: { to: string; clientName: string; setupToken: string }) {
  if (!resend) {
    console.warn('[Email] Resend non configuré, simulation pour:', opts.to)
    return
  }
  const setupUrl = APP_URL + '/setup?token=' + opts.setupToken
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: 'Bienvenue dans votre espace client LocalSud',
      html: emailLayout({
        title: 'Bienvenue dans votre espace client',
        intro: 'Bonjour <strong>' + opts.clientName + '</strong>,<br><br>Hugo a créé votre espace client LocalSud. Pour y accéder, créez votre mot de passe en cliquant sur le bouton ci-dessous :',
        ctaLabel: 'Créer mon mot de passe',
        ctaUrl: setupUrl,
        footer: 'Ce lien est valable 7 jours. Si vous n\\'attendiez pas cet email, ignorez-le.',
      }),
    })
  } catch (err: any) {
    console.error('[Email] Erreur invitation :', err.message)
  }
}

export async function sendResetPasswordEmail(opts: { to: string; name?: string | null; resetToken: string }) {
  if (!resend) return
  const url = APP_URL + '/reset?token=' + opts.resetToken
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: 'Réinitialisation de votre mot de passe LocalSud',
      html: emailLayout({
        title: 'Réinitialisation du mot de passe',
        intro: 'Bonjour' + (opts.name ? ' <strong>' + opts.name + '</strong>' : '') + ',<br><br>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :',
        ctaLabel: 'Choisir un nouveau mot de passe',
        ctaUrl: url,
        footer: 'Ce lien est valable 1 heure. Si vous n\\'avez pas demandé ce reset, ignorez cet email.',
      }),
    })
  } catch (err: any) {
    console.error('[Email] Erreur reset :', err.message)
  }
}
