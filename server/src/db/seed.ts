import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { getDb } from './config/db'
import { branchesTable, type BranchRow } from './models/Branch'
import { usersTable } from './models/User'
import { diningTablesTable } from './models/DiningTable'
import { menuItemsTable } from './models/MenuItem'
import { reservationsTable } from './models/Reservation'
import { feedbackTable } from './models/Feedback'
import { careerPostingsTable } from './models/CareerPosting'
import { jobApplicationsTable } from './models/JobApplication'
import { addDays, todayString } from './utils/validate'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load env from the project root (.env), falling back to server/.env so the seed
// works whether launched from the root or from inside the workspace.
for (const envPath of [path.resolve(__dirname, '../.env'), path.resolve(process.cwd(), '.env')]) {
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath })
    break
  }
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@wyndells.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!'
const MANAGER_PASSWORD = process.env.MANAGER_PASSWORD || 'Manager123!'

const BRANCH_DATA = [
  {
    name: 'Sampaloc, Tanay',
    code: 'sampaloc-tanay',
    address: 'Sampaloc, Tanay, Rizal',
    city: 'Tanay',
    contactNumber: '0917 123 4567',
    email: 'sampaloc@wyndells.com',
    hours: '10:00 AM – 10:00 PM',
    description:
      'Our first home — an open-air garden restaurant surrounded by greenery, perfect for family dining and quiet afternoons.',
  },
  {
    name: 'Tanay Bayan',
    code: 'tanay-bayan',
    address: 'Bayan, Tanay, Rizal',
    city: 'Tanay',
    contactNumber: '0917 234 5678',
    email: 'bayan@wyndells.com',
    hours: '10:00 AM – 10:00 PM',
    description:
      'Al fresco dining under the trees with rustic wooden tables and a laid-back provincial atmosphere.',
  },
  {
    name: 'Antipolo',
    code: 'antipolo',
    address: 'Antipolo, Rizal',
    city: 'Antipolo',
    contactNumber: '0917 345 6789',
    email: 'antipolo@wyndells.com',
    hours: '10:00 AM – 9:30 PM',
    description:
      'A breezy modern branch with wide verandas, native plants, and space for large group gatherings.',
  },
  {
    name: 'Masinag',
    code: 'masinag',
    address: 'Masinag, Rizal',
    city: 'Masinag',
    contactNumber: '0917 456 7890',
    email: 'masinag@wyndells.com',
    hours: '10:00 AM – 9:30 PM',
    description:
      'Conveniently located for travellers — a warm, garden-style stop with the same home-style Filipino grill.',
  },
]

const TABLE_TEMPLATE = [
  { tableNumber: 'T1', capacity: 2, location: 'Al Fresco' },
  { tableNumber: 'T2', capacity: 2, location: 'Al Fresco' },
  { tableNumber: 'T3', capacity: 4, location: 'Garden' },
  { tableNumber: 'T4', capacity: 4, location: 'Main Hall' },
  { tableNumber: 'T5', capacity: 4, location: 'Main Hall' },
  { tableNumber: 'T6', capacity: 6, location: 'Veranda' },
  { tableNumber: 'T7', capacity: 6, location: 'Garden' },
  { tableNumber: 'T8', capacity: 10, location: 'Family Corner' },
]

const MENU_TEMPLATE = [
  { name: 'Inihaw na Baboy Roll', description: 'Grilled pork rolls with tangy sawsawan dip.', price: 245, category: 'Appetizers', isFeatured: true },
  { name: 'Crispy Chicharon', description: 'Golden fried pork cracklings, garlic vinegar dip.', price: 185, category: 'Appetizers', isFeatured: false },
  { name: 'Fresh Lumpia', description: 'Crisp vegetable lumpia with sweet chilli.', price: 165, category: 'Appetizers', isFeatured: false },
  { name: 'Lechon Kawali', description: 'Roasted crispy pork belly, house sawsawan.', price: 445, category: 'Main Courses', isFeatured: true },
  { name: 'Crispy Pata', description: 'Deep-fried pork knuckle, soy-garlic glaze.', price: 495, category: 'Main Courses', isFeatured: true },
  { name: 'Inihaw na Baboy', description: 'Charcoal-grilled pork, calamansi-marinade.', price: 465, category: 'Main Courses', isFeatured: false },
  { name: 'Sinigang na Baboy Rice Bowl', description: 'Sour broth braised pork over steamed rice.', price: 320, category: 'Rice Meals', isFeatured: true },
  { name: 'Bulalo Rice Meal', description: 'Hearty beef shank soup served with rice.', price: 350, category: 'Rice Meals', isFeatured: false },
  { name: 'Garlic Rice', description: 'Fluffy rice tossed with toasted garlic.', price: 80, category: 'Rice Meals', isFeatured: false },
  { name: 'Calamansi Cooler', description: 'Fresh calamansi juice over crushed ice.', price: 95, category: 'Drinks', isFeatured: false },
  { name: "Sago't Gulaman", description: 'Classic sago and gulaman in brown sugar syrup.', price: 85, category: 'Drinks', isFeatured: true },
  { name: 'Buko Juice', description: 'Chilled young coconut juice.', price: 90, category: 'Drinks', isFeatured: false },
  { name: 'Turón', description: 'Banana and jackfruit spring rolls, caramel sugar.', price: 120, category: 'Desserts', isFeatured: true },
  { name: 'Leche Flan', description: 'Silky caramel custard flan.', price: 110, category: 'Desserts', isFeatured: false },
  { name: 'Fresh Suman', description: 'Steamed glutinous rice cakes, latik syrup.', price: 95, category: 'Desserts', isFeatured: false },
  { name: 'Handaan Fresh Buko Salad', description: 'Light coconut-jackfruit salad to share.', price: 150, category: 'Others', isFeatured: false },
]

const SAMPLE_COMMENTS = [
  'Loved the lechon kawali — the whole family enjoyed our afternoon. Staff were so warm!',
  'Beautiful al fresco spot. The sago\u2019t gulaman took me back to my hometown.',
  'Reservation was honored on time and the table by the garden was perfect.',
  'Fresh food, friendly service, and a relaxing vibe. We will definitely come back.',
  'Great place for a group dinner. The inihaw na baboy plates are generous.',
]

const FEEDBACK_NAMES = ['Maria Santos', 'Josefina Reyes', 'Andres Cruz', 'Bianca Dela Cruz', 'Ramon Aguila']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrCreateBranch(data: (typeof BRANCH_DATA)[number]): Promise<BranchRow> {
  const { data: existing } = await getDb().from(branchesTable).select('*').eq('code', data.code).maybeSingle()
  if (existing) {
    return existing as BranchRow
  }
  const { data: created, error } = await getDb()
    .from(branchesTable)
    .insert({
      name: data.name,
      code: data.code,
      address: data.address,
      city: data.city,
      contact_number: data.contactNumber,
      email: data.email,
      hours: data.hours,
      description: data.description,
      is_active: true,
    })
    .select('*')
    .single()
  if (error) {
    throw error
  }
  return created as BranchRow
}

/**
 * Fills in profile details (migration 0003 columns) on accounts that were
 * seeded before the migration existed. Empty columns only, so a staff member's
 * own edits are never overwritten when the seed is re-run.
 */
async function backfillProfile(
  existing: Record<string, unknown> & { id: string; email?: unknown },
  data: { position?: string; contactNumber?: string; address?: string; avatarUrl?: string; bio?: string },
) {
  const pairs: [string, string | undefined][] = [
    ['position', data.position],
    ['contact_number', data.contactNumber],
    ['address', data.address],
    ['avatar_url', data.avatarUrl],
    ['bio', data.bio],
  ]
  const updates: Record<string, string> = {}
  for (const [column, value] of pairs) {
    if (value && !String(existing[column] ?? '')) {
      updates[column] = value
    }
  }
  if (Object.keys(updates).length === 0) {
    return existing
  }
  const { data: updated, error } = await getDb()
    .from(usersTable)
    .update(updates)
    .eq('id', String(existing.id))
    .select('*')
    .single()
  if (error) {
    throw error
  }
  console.log(`Profile backfilled: ${String(existing.email ?? existing.id)}`)
  return updated
}

async function getOrCreateUser(data: {
  name: string
  email: string
  password: string
  role: 'admin' | 'manager'
  branchId?: string
  position?: string
  contactNumber?: string
  address?: string
  avatarUrl?: string
  bio?: string
}) {
  const { data: existing } = await getDb().from(usersTable).select('*').eq('email', data.email).maybeSingle()
  if (existing) {
    return await backfillProfile(existing, data)
  }
  const { data: created, error } = await getDb()
    .from(usersTable)
    .insert({
      name: data.name,
      email: data.email,
      password_hash: await bcrypt.hash(data.password, 10),
      role: data.role,
      assigned_branch_id: data.branchId ?? null,
      is_active: true,
      position: data.position ?? '',
      contact_number: data.contactNumber ?? '',
      address: data.address ?? '',
      avatar_url: data.avatarUrl ?? '',
      bio: data.bio ?? '',
    })
    .select('*')
    .single()
  if (error) {
    throw error
  }
  return created
}

async function seedBranchesAndUsers() {
  const branches = []
  for (const data of BRANCH_DATA) {
    branches.push(await getOrCreateBranch(data))
  }
  console.log(`Branches ready: ${branches.length}`)

  await getOrCreateUser({
    name: 'Wyndell\'s Administrator',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'admin',
    position: 'Operations Administrator',
    contactNumber: '0917 000 0001',
    address: 'Wyndell\'s Head Office, Tanay, Rizal',
    bio: 'Owns staff accounts, branches and reporting for every Wyndell\'s location.',
  })
  console.log(`Admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)

  for (const branch of branches) {
    const manager = await getOrCreateUser({
      name: `Manager — ${branch.name}`,
      email: `${branch.code}@wyndells.com`,
      password: MANAGER_PASSWORD,
      role: 'manager',
      branchId: String(branch.id),
      position: `Branch Manager — ${branch.name}`,
      contactNumber: branch.contact_number,
      address: branch.address,
      bio: `Runs day-to-day operations for the ${branch.name} branch.`,
    })
    console.log(`Manager ready: ${manager.email} / ${MANAGER_PASSWORD}`)
  }
  return branches
}

async function seedBranchContent() {
  const { data: branches, error } = await getDb().from(branchesTable).select('*')
  if (error) {
    throw error
  }
  for (const branch of branches as BranchRow[]) {
    // Tables
    const { count: tableCount } = await getDb()
      .from(diningTablesTable)
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
    if ((tableCount ?? 0) === 0) {
      const tables = TABLE_TEMPLATE.map((table) => ({
        table_number: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        branch_id: branch.id,
        status: 'available',
        is_active: true,
      }))
      const { error: insertError } = await getDb().from(diningTablesTable).insert(tables)
      if (insertError) {
        throw insertError
      }
      console.log(`  ${branch.name}: ${tables.length} tables added`)
    } else {
      console.log(`  ${branch.name}: ${tableCount} tables already present`)
    }

    // Menu
    const { count: menuCount } = await getDb()
      .from(menuItemsTable)
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
    if ((menuCount ?? 0) === 0) {
      const items = MENU_TEMPLATE.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        is_featured: item.isFeatured,
        status: 'available',
        branch_id: branch.id,
      }))
      const { error: insertError } = await getDb().from(menuItemsTable).insert(items)
      if (insertError) {
        throw insertError
      }
      console.log(`  ${branch.name}: ${items.length} menu items added`)
    } else {
      console.log(`  ${branch.name}: ${menuCount} menu items already present`)
    }
  }
  return branches
}

async function seedSamples() {
  const { data: branches } = await getDb().from(branchesTable).select('*')
  const today = todayString()

  for (const branch of branches as BranchRow[]) {
    const { data: tableRows } = await getDb()
      .from(diningTablesTable)
      .select('*')
      .eq('branch_id', branch.id)
      .order('capacity')
      .limit(4)
    const tables = tableRows ?? []
    const tableFor = (index: number) => (tables[index % Math.max(tables.length, 1)]?.id ?? null)

    const sampleReservations: {
      reference: string
      branch_id: string
      customer_name: string
      email: string
      contact_number: string
      date: string
      time: string
      guests: number
      special_requests: string
      status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no-show'
      table_id: string | null
      status_history: { status: string; note: string; changedAt?: string }[]
    }[] = [
      {
        reference: `WYN-SEED${1}`, branch_id: branch.id,
        customer_name: 'Ana Villanueva', email: 'ana.v@example.com', contact_number: '0917 555 0101',
        date: addDays(today, -2), time: '18:30', guests: 4, special_requests: 'Window seat please',
        status: 'completed', table_id: tableFor(0),
        status_history: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date().toISOString() },
          { status: 'completed', note: 'Guest visited', changedAt: new Date().toISOString() },
        ],
      },
      {
        reference: `WYN-SEED${2}`, branch_id: branch.id,
        customer_name: 'Carlo Mercado', email: 'carlo.m@example.com', contact_number: '0917 555 0202',
        date: addDays(today, -1), time: '12:00', guests: 2, special_requests: '',
        status: 'cancelled', table_id: tableFor(1),
        status_history: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date().toISOString() },
          { status: 'cancelled', note: 'Customer cancelled', changedAt: new Date().toISOString() },
        ],
      },
      {
        reference: `WYN-SEED${3}`, branch_id: branch.id,
        customer_name: 'Nica Dimagiba', email: 'nica.d@example.com', contact_number: '0917 555 0303',
        date: addDays(today, 1), time: '17:30', guests: 6, special_requests: 'Birthday dessert surprise!',
        status: 'confirmed', table_id: tableFor(2),
        status_history: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date().toISOString() },
        ],
      },
      {
        reference: `WYN-SEED${4}`, branch_id: branch.id,
        customer_name: 'Rico Manalang', email: 'rico.m@example.com', contact_number: '0917 555 0404',
        date: addDays(today, 2), time: '19:00', guests: 3, special_requests: '',
        status: 'pending', table_id: null,
        status_history: [{ status: 'pending', note: 'Reservation submitted' }],
      },
    ]

    for (const sample of sampleReservations) {
      const { data: existing } = await getDb()
        .from(reservationsTable)
        .select('id')
        .eq('reference', sample.reference)
        .maybeSingle()
      if (!existing) {
        const { error: insertError } = await getDb().from(reservationsTable).insert(sample)
        if (insertError) {
          throw insertError
        }
      }
    }

    const { count: feedbackCount } = await getDb()
      .from(feedbackTable)
      .select('id', { count: 'exact', head: true })
      .eq('branch_id', branch.id)
    if ((feedbackCount ?? 0) === 0) {
      const feedback = []
      for (let index = 0; index < 4; index += 1) {
        feedback.push({
          branch_id: branch.id,
          customer_name: FEEDBACK_NAMES[index % FEEDBACK_NAMES.length],
          contact_number: `0917 555 100${index}`,
          rating: 4 + (index % 2),
          comment: SAMPLE_COMMENTS[index % SAMPLE_COMMENTS.length],
          reservation_reference: `WYN-SEED${index + 1}`,
        })
      }
      const { error: insertError } = await getDb().from(feedbackTable).insert(feedback)
      if (insertError) {
        throw insertError
      }
      console.log(`  ${branch.name}: sample feedback added`)
    }
    console.log(`  ${branch.name}: sample reservations + feedback checked`)
  }
}

async function seedCareers() {
  const { data: branches } = await getDb().from(branchesTable).select('*')

  const POSTING_TEMPLATE = [
    {
      title: 'Service Crew (Restaurant)',
      department: 'restaurant',
      employment_type: 'Full-time',
      summary: 'Welcoming guests, taking orders, and keeping garden tables running smoothly.',
      description:
        'Our restaurant team is the heart of the Wyndell’s experience. You’ll greet guests, take orders,\nshare menu recommendations, and work as a team to keep every table happy across busy lunch and dinner services.',
      requirements:
        'Friendly personality, good spoken English and Filipino, able to stand for long shifts,\nand available to work weekends. Experience in food service is a plus but not required — we train new crew.',
    },
    {
      title: 'Line Cook (Restaurant)',
      department: 'restaurant',
      employment_type: 'Full-time',
      summary: 'Preparing our inihaw grill and kitchen staples during service.',
      description:
        'Join the kitchen behind our signature inihaw na baboy and crispy pata. You’ll handle prep,\ngrill station work, plating, and keep the line clean and ready for each service.',
      requirements:
        'At least 1 year of kitchen experience, comfortable with a charcoal grill,\nand able to work evenings and weekends. Must follow food safety and hygiene standards.',
    },
    {
      title: 'Barista (Cafe)',
      department: 'cafe',
      employment_type: 'Part-time',
      summary: 'Brewing espresso drinks and serving fresh dessert plates at our cafe counter.',
      description:
        'Run the cafe counter — pulling shots, steaming milk, and plating our turón and leche flan.\nYou’ll also help with opening and closing duties and keep the cafe corner spotless.',
      requirements:
        'Comfortable learning espresso and milk texturing (training provided),\nsmiling customer service, and reliable morning availability on weekdays.',
    },
    {
      title: 'Guest Relations Assistant (Restaurant)',
      department: 'restaurant',
      employment_type: 'Full-time',
      summary: 'Supporting reservations, walk-ins, and guest check-in at the front desk.',
      description:
        'Be the first face guests see: manage the reservations list, seat walk-ins, answer phone\ninquiries, and support the floor team during peak hours.',
      requirements:
        'Organised and calm under pressure, good phone etiquette, fluent in Filipino and English,\nand comfortable with basic computer / POS use.',
    },
  ]

  const APPLICANT_NAMES = ['Katrina Lim', 'Paolo Enriquez', 'Mikaela Torres']
  const SAMPLE_INTROS = [
    'Hi! I’ve always loved the warm, home-style feel of Wyndell’s and would be honoured to join the team. I have two years of service experience and I’m comfortable on busy weekend shifts.',
    'I’m a hard worker based near the branch, with kitchen experience from a family eatery. I can start immediately and am keen to learn the Wyndell’s way of doing things.',
    'I love meeting people and keeping things organised. I’m quick to learn, available on short notice, and ready to grow with the branch.',
  ]

  for (const branch of branches as BranchRow[]) {
    const { data: postingRows } = await getDb()
      .from(careerPostingsTable)
      .select('id')
      .eq('branch_id', branch.id)
    if ((postingRows ?? []).length > 0) {
      console.log(`  ${branch.name}: career postings already present`)
      continue
    }

    const postings = POSTING_TEMPLATE.map((sample) => ({
      branch_id: branch.id,
      title: sample.title,
      department: sample.department,
      employment_type: sample.employment_type,
      summary: sample.summary,
      description: sample.description,
      requirements: sample.requirements,
      // Keep the second template role closed so staff can see the open/closed states.
      status: sample.title.includes('Line Cook') ? 'closed' : 'open',
    }))

    const { error: insertError, data: insertedData } = await getDb()
      .from(careerPostingsTable)
      .insert(postings)
      .select('id, status')
    if (insertError) {
      throw insertError
    }
    const inserted = insertedData ?? []
    console.log(`  ${branch.name}: ${postings.length} career postings added`)

    // Sample applications for a couple of the open postings only.
    const openIds = inserted
      .filter((row) => row.status === 'open')
      .map((row) => row.id)
      .slice(0, 2)
    const applications = []
    for (const [index, applicant] of APPLICANT_NAMES.entries()) {
      if (openIds.length === 0) {
        break
      }
      applications.push({
        posting_id: openIds[index % openIds.length],
        full_name: applicant,
        email: `${applicant.split(' ')[0].toLowerCase()}.${applicant.split(' ')[1]?.toLowerCase() ?? 'x'}@example.com`,
        contact_number: `0917 555 90${index}${index}`,
        cover_letter: SAMPLE_INTROS[index % SAMPLE_INTROS.length],
        resume_url: `https://example.com/resumes/${applicant.split(' ')[0].toLowerCase()}-resume.pdf`,
        status: index === 0 ? 'reviewed' : 'new',
      })
    }
    if (applications.length > 0) {
      const { error: appError } = await getDb().from(jobApplicationsTable).insert(applications)
      if (appError) {
        throw appError
      }
      console.log(`  ${branch.name}: ${applications.length} sample applications added`)
    }
  }
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const { data, error } = await getDb().from(branchesTable).select('id').limit(1)
  if (error) {
    throw error
  }
  void data
  console.log(`Connected to Supabase: ${supabaseUrl ? new URL(supabaseUrl).hostname : 'unknown host'}`)

  await seedBranchesAndUsers()
  await seedBranchContent()
  await seedSamples()
  await seedCareers()

  console.log('Seed complete ✔')
}

try {
  await main()
} catch (error) {
  console.error('Seeding failed:', error)
  process.exitCode = 1
}