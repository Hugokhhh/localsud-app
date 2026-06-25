import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seed...')

  // ====== 1. Créer le compte administrateur ======
  const adminEmail = process.env.ADMIN_EMAIL || 'sofiane@localsud.fr'
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMoiVite!2026'
  const adminName = process.env.ADMIN_NAME || 'Sofiane M.'

  const adminHash = await bcrypt.hash(adminPassword, 10)

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: 'ADMIN', name: adminName },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      name: adminName,
      role: 'ADMIN',
    },
  })

  console.log(`✅ Admin créé : ${adminEmail}`)
  console.log(`   Mot de passe : ${adminPassword}`)
  console.log(`   ⚠️  Change-le après la première connexion !`)

  // ====== 2. Créer 3 clients démo ======

  // Client 1 : Maison Colette (avec projet actif)
  const demo1Hash = await bcrypt.hash('demo1234', 10)
  const demo1 = await prisma.user.upsert({
    where: { email: 'contact@maison-colette.fr' },
    update: {},
    create: {
      email: 'contact@maison-colette.fr',
      passwordHash: demo1Hash,
      name: 'Maison Colette',
      role: 'CLIENT',
      client: {
        create: {
          company: 'Maison Colette',
          trade: 'Restaurant',
          city: 'Montpellier',
          phone: '+33 4 67 00 00 00',
          projects: {
            create: {
              name: 'Site Maison Colette',
              type: 'VITRINE',
              status: 'RETOURS',
              totalPrice: 2400,
              mockupUrl: 'https://www.figma.com/file/abc123/maison-colette-v2',
              documentsUrl: 'https://drive.google.com/drive/folders/xyz456',
              estimatedDelivery: new Date('2026-06-12'),
              payments: {
                create: [
                  { label: 'Acompte 30%', amount: 720, status: 'PAID', paidAt: new Date('2026-05-14'), dueDate: new Date('2026-05-14'), invoiceRef: 'LS-2026-014', order: 0 },
                  { label: 'Validation maquette 30%', amount: 720, status: 'PAID', paidAt: new Date('2026-05-28'), dueDate: new Date('2026-05-28'), invoiceRef: 'LS-2026-015', order: 1 },
                  { label: 'Solde 40%', amount: 960, status: 'PENDING', dueDate: new Date('2026-06-12'), invoiceRef: 'LS-2026-016', order: 2 },
                ],
              },
              steps: {
                create: [
                  { title: 'Brief & cadrage', order: 0, completed: true, completedAt: new Date('2026-05-14') },
                  { title: 'Maquette', order: 1, completed: true, completedAt: new Date('2026-05-25') },
                  { title: 'Retours & validation', order: 2, completed: false },
                  { title: 'Intégration', order: 3, completed: false },
                  { title: 'Mise en ligne', order: 4, completed: false },
                ],
              },
            },
          },
        },
      },
    },
    include: { client: { include: { projects: true } } },
  })

  // Ajouter quelques commentaires de démo sur le projet de Maison Colette
  const project1 = demo1.client?.projects[0]
  if (project1) {
    // Récupérer l'admin pour les commentaires
    const admin = await prisma.user.findUnique({ where: { email: adminEmail } })

    // Commentaire 1 - client
    await prisma.comment.create({
      data: {
        projectId: project1.id,
        authorId: demo1.id,
        type: 'MODIFICATION',
        status: 'OPEN',
        section: 'Hero',
        content: "Le bleu du bandeau du haut est un peu trop foncé à mon goût. Pourriez-vous tester avec un bleu plus clair, proche du logo ? Et est-ce qu'on pourrait agrandir la photo principale ?",
      },
    })

    // Commentaire 2 - question admin avec réponse client
    const q = await prisma.comment.create({
      data: {
        projectId: project1.id,
        authorId: admin!.id,
        type: 'QUESTION',
        status: 'IN_PROGRESS',
        section: 'Contact',
        content: 'Bonjour, souhaitez-vous afficher un bouton WhatsApp en plus du téléphone et de l\'email sur la section contact ?',
      },
    })
    await prisma.comment.create({
      data: {
        projectId: project1.id,
        authorId: demo1.id,
        parentId: q.id,
        type: 'QUESTION',
        status: 'IN_PROGRESS',
        section: 'Contact',
        content: 'Oui parfait, ajoutons WhatsApp : 06 XX XX XX XX',
      },
    })

    // Commentaire 3 - validation
    await prisma.comment.create({
      data: {
        projectId: project1.id,
        authorId: demo1.id,
        type: 'VALIDATION',
        status: 'RESOLVED',
        section: 'Services',
        content: "Top, les contenus sont bien présentés et l'ordre des sections me convient. Validé de mon côté ✅",
      },
    })

    // Commentaire 4 - idée
    await prisma.comment.create({
      data: {
        projectId: project1.id,
        authorId: demo1.id,
        type: 'IDEA',
        status: 'OPEN',
        section: 'Accueil',
        content: 'Une idée : est-ce qu\'on pourrait ajouter une galerie ou un carrousel de photos pour mettre en avant nos produits / réalisations ?',
      },
    })
  }

  console.log('✅ Client démo créé : contact@maison-colette.fr / demo1234')

  // Client 2 : Cabinet Berger
  const demo2Hash = await bcrypt.hash('demo1234', 10)
  await prisma.user.upsert({
    where: { email: 'contact@cabinet-berger.fr' },
    update: {},
    create: {
      email: 'contact@cabinet-berger.fr',
      passwordHash: demo2Hash,
      name: 'Cabinet Berger',
      role: 'CLIENT',
      client: {
        create: {
          company: 'Cabinet Berger',
          trade: 'Avocat',
          city: 'Toulouse',
          projects: {
            create: {
              name: 'Site Cabinet Berger',
              type: 'VITRINE',
              status: 'INTEGRATION',
              totalPrice: 3000,
              estimatedDelivery: new Date('2026-07-04'),
              payments: {
                create: [
                  { label: 'Acompte 50%', amount: 1500, status: 'PAID', paidAt: new Date('2026-05-20'), dueDate: new Date('2026-05-20'), order: 0 },
                  { label: 'Solde 50%', amount: 1500, status: 'PENDING', dueDate: new Date('2026-07-04'), order: 1 },
                ],
              },
            },
          },
        },
      },
    },
  })

  // Client 3 : Studio Belaire
  const demo3Hash = await bcrypt.hash('demo1234', 10)
  await prisma.user.upsert({
    where: { email: 'hello@studio-belaire.com' },
    update: {},
    create: {
      email: 'hello@studio-belaire.com',
      passwordHash: demo3Hash,
      name: 'Studio Belaire',
      role: 'CLIENT',
      client: {
        create: {
          company: 'Studio Belaire',
          trade: 'Architecte',
          city: 'Lyon',
          projects: {
            create: {
              name: 'Refonte Studio Belaire',
              type: 'REFONTE',
              status: 'MAQUETTE',
              totalPrice: 1800,
              estimatedDelivery: new Date('2026-07-18'),
              payments: {
                create: [
                  { label: 'Acompte 50%', amount: 900, status: 'PAID', paidAt: new Date('2026-06-01'), dueDate: new Date('2026-06-01'), order: 0 },
                  { label: 'Solde 50%', amount: 900, status: 'PENDING', dueDate: new Date('2026-07-18'), order: 1 },
                ],
              },
            },
          },
        },
      },
    },
  })

  console.log('🎉 Seed terminé avec succès')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
