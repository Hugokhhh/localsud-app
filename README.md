# 🟡 LocalSud — Application de suivi projets clients

App web Next.js pour piloter tes projets clients web : espace client (retours, factures, maquette), espace admin (création comptes, gestion projets, facturation avec PDF).

---

## 🛠️ Stack

- **Next.js 14** (App Router)
- **Prisma + PostgreSQL** (Neon recommandé)
- **NextAuth.js v5** (auth email + password)
- **Vercel Blob** (stockage PDF factures + pièces jointes)
- **Resend** (emails transactionnels)
- **Tailwind CSS**

---

## 📦 Installation

```bash
# 1. Cloner / dézipper le projet
cd localsud-app

# 2. Installer les dépendances
npm install

# 3. Copier la conf
cp .env.example .env
# Puis remplir les variables (voir ci-dessous)

# 4. Initialiser la base
npx prisma db push
npx prisma db seed

# 5. Lancer en local
npm run dev
```

L'app tourne sur `http://localhost:3000`.

---

## 🔑 Variables d'environnement

### `DATABASE_URL` — PostgreSQL
Crée une DB gratuite sur [Neon](https://neon.tech) (5 min). Récupère l'URL au format `postgresql://...`.

### `AUTH_SECRET` — Clé NextAuth
Génère-la avec :
```bash
openssl rand -base64 32
```

### `RESEND_API_KEY` — Emails
1. Créer un compte sur [Resend](https://resend.com) (gratuit, 3000 emails/mois)
2. Vérifier ton domaine `localsud.fr` (DNS)
3. Récupérer la clé API
4. Remplir aussi `RESEND_FROM="LocalSud <noreply@localsud.fr>"`

### `BLOB_READ_WRITE_TOKEN` — Vercel Blob
1. Dans ton projet Vercel → Storage → Create Database → Blob
2. Connecte le Blob au projet, le token est ajouté automatiquement

### `ADMIN_EMAIL` / `ADMIN_PASSWORD` — Compte admin initial
Ton compte créé au seed. **Change le mot de passe après ta première connexion.**

---

## 🚀 Déploiement sur Vercel

1. Push le code sur GitHub
2. Sur Vercel : "New Project" → importer ton repo
3. Ajouter toutes les variables d'env dans Vercel
4. Ajouter ton domaine `app.localsud.fr` (DNS : CNAME vers `cname.vercel-dns.com`)
5. Déployer

À chaque push sur `main`, Vercel rebuild automatiquement.

---

## 👤 Comptes de démonstration (après seed)

| Email | Mot de passe | Rôle |
|---|---|---|
| `sofiane@localsud.fr` | (celui de `ADMIN_PASSWORD`) | **Admin** |
| `contact@maison-colette.fr` | `demo1234` | Client (projet RETOURS) |
| `contact@cabinet-berger.fr` | `demo1234` | Client (projet INTÉGRATION) |
| `hello@studio-belaire.com` | `demo1234` | Client (projet MAQUETTE) |

---

## 🗺️ URLs principales

- `/connexion` — Login (clients + admin)
- `/setup?token=xxx` — Création de mot de passe (lien reçu par email)
- `/mot-de-passe-oublie` — Demande de reset
- `/reset?token=xxx` — Reset effectif (lien reçu par email)
- `/espace` — Espace client (Accueil / Mes projets / Mes factures)
- `/admin` — Tableau de bord admin
- `/admin/clients` — Liste tous les clients
- `/admin/clients/[id]` — Fiche détaillée d'un projet client (édition complète)

---

## 🏗️ Structure du projet

```
localsud-app/
├── prisma/
│   ├── schema.prisma     # Modèle de données (User, Client, Project, Payment, Comment, Attachment)
│   └── seed.ts           # Données de démarrage
├── src/
│   ├── app/
│   │   ├── api/          # Routes API (auth, clients, projects, payments, comments, attachments)
│   │   ├── connexion/    # Login
│   │   ├── setup/        # Création mdp via token
│   │   ├── reset/        # Reset mdp
│   │   ├── espace/       # Espace client
│   │   └── admin/        # Espace admin
│   ├── components/       # AuthShell, Sidebar, CommentThread...
│   ├── lib/              # prisma, auth, emails, utils
│   └── middleware.ts     # Protection routes selon rôle
└── package.json
```

---

## 🎨 Charte graphique

- **Bleu marine** `#0B1F4D` (ink) — primary
- **Jaune** `#FFCB3D` (yellow) — accent
- **Police** : Plus Jakarta Sans (Google Fonts)
- **Italiques jaune** sur les mots-accents

---

## 📝 Notes

- L'app utilise les **status checks Next.js stricts** et **TypeScript**
- Tous les uploads (PDF factures + pièces jointes commentaires) passent par **Vercel Blob** (gratuit jusqu'à 5 GB)
- Les emails sont envoyés via **Resend** (gratuit jusqu'à 3000/mois, largement suffisant)
- L'auth est isolée : un client ne peut JAMAIS accéder à `/admin` même en connaissant l'URL (vérification côté serveur dans le middleware)
- TVA non applicable, art. 293 B du CGI (auto-entrepreneur) — déjà géré

---

🟡 Bonne agence ! — Construit avec ❤️ pour LocalSud
