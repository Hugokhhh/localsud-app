import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.RESEND_FROM || 'LocalSud <noreply@localsud.fr>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/** Email envoyé au client lors de la création de son compte */
export async function sendInvitationEmail(opts: { to: string; clientName: string; setupToken: string }) {
  if (!resend) {
    console.warn('[Email] Resend non configuré, email simulé pour:', opts.to)
    console.log('[Email] Lien de création :', `${APP_URL}/setup?token=${opts.setupToken}`)
    return
  }

  const setupUrl = `${APP_URL}/setup?token=${opts.setupToken}`

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Bienvenue dans votre espace client LocalSud',
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"><title>Bienvenue chez LocalSud</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F7F8FC; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #E7EAF3;">
          <div style="background: #0B1F4D; color: white; padding: 36px 32px; text-align: center;">
            <div style="font-size: 28px; font-weight: 800; letter-spacing: -0.02em;">
              Local<span style="color: #FFCB3D;">Sud</span>
            </div>
            <h1 style="margin: 18px 0 6px; font-size: 22px; font-weight: 700;">Bienvenue dans votre espace client</h1>
            <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">Votre projet web démarre maintenant</p>
          </div>

          <div style="padding: 32px;">
            <p style="font-size: 15px; line-height: 1.6; color: #4A5680; margin: 0 0 14px;">
              Bonjour <strong style="color: #0B1F4D;">${opts.clientName}</strong>,
            </p>
            <p style="font-size: 15px; line-height: 1.6; color: #4A5680; margin: 0 0 22px;">
              Sofiane a créé votre espace client LocalSud. Pour y accéder, créez votre mot de passe en cliquant sur le bouton ci-dessous :
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${setupUrl}" style="display: inline-block; background: #FFCB3D; color: #0B1F4D; padding: 14px 32px; border-radius: 100px; font-weight: 700; text-decoration: none; font-size: 15px;">
                Créer mon mot de passe
              </a>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #8B93AC; margin: 22px 0 0; text-align: center;">
              Ce lien est valide pendant <strong>7 jours</strong>.<br>
              Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.
            </p>
          </div>

          <div style="padding: 16px 32px; border-top: 1px solid #E7EAF3; font-size: 11px; color: #8B93AC; text-align: center;">
            LocalSud · Agence web · <a href="https://localsud.fr" style="color: #0B1F4D; text-decoration: none;">localsud.fr</a>
          </div>
        </div>
      </body>
      </html>
    `,
  })
}

/** Email de réinitialisation du mot de passe */
export async function sendResetPasswordEmail(opts: { to: string; name: string; resetToken: string }) {
  if (!resend) {
    console.warn('[Email] Resend non configuré, email simulé pour:', opts.to)
    console.log('[Email] Lien de reset :', `${APP_URL}/reset?token=${opts.resetToken}`)
    return
  }

  const resetUrl = `${APP_URL}/reset?token=${opts.resetToken}`

  await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: 'Réinitialisation de votre mot de passe LocalSud',
    html: `
      <!DOCTYPE html>
      <html lang="fr">
      <head><meta charset="UTF-8"></head>
      <body style="font-family: -apple-system, sans-serif; background: #F7F8FC; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; border: 1px solid #E7EAF3;">
          <div style="background: #0B1F4D; color: white; padding: 32px; text-align: center;">
            <div style="font-size: 26px; font-weight: 800;">Local<span style="color: #FFCB3D;">Sud</span></div>
            <h1 style="margin: 16px 0 4px; font-size: 20px;">Mot de passe oublié</h1>
          </div>
          <div style="padding: 32px;">
            <p style="font-size: 15px; color: #4A5680; line-height: 1.6; margin: 0 0 14px;">
              Bonjour <strong>${opts.name}</strong>,
            </p>
            <p style="font-size: 15px; color: #4A5680; line-height: 1.6; margin: 0 0 24px;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en choisir un nouveau :
            </p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${resetUrl}" style="display: inline-block; background: #0B1F4D; color: white; padding: 14px 32px; border-radius: 100px; font-weight: 700; text-decoration: none;">
                Réinitialiser mon mot de passe
              </a>
            </div>
            <p style="font-size: 13px; color: #8B93AC; line-height: 1.6; text-align: center; margin: 22px 0 0;">
              Ce lien est valide pendant <strong>1 heure</strong>.<br>
              Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
            </p>
          </div>
          <div style="padding: 16px 32px; border-top: 1px solid #E7EAF3; font-size: 11px; color: #8B93AC; text-align: center;">
            LocalSud · Agence web · localsud.fr
          </div>
        </div>
      </body>
      </html>
    `,
  })
}
