import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { BranchModel } from './models/Branch'
import { UserModel } from './models/User'
import { DiningTableModel } from './models/DiningTable'
import { MenuItemModel } from './models/MenuItem'
import { ReservationModel } from './models/Reservation'
import { FeedbackModel } from './models/Feedback'
import { addDays, todayString } from './utils/validate'

const URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wyndells'

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

async function getOrCreateBranch(data: (typeof BRANCH_DATA)[number]) {
  const existing = await BranchModel.findOne({ code: data.code })
  if (existing) {
    return existing
  }
  return BranchModel.create({ ...data, isActive: true })
}

async function getOrCreateUser(data: { name: string; email: string; password: string; role: 'admin' | 'manager'; branchId?: string }) {
  const existing = await UserModel.findOne({ email: data.email })
  if (existing) {
    return existing
  }
  return UserModel.create({
    name: data.name,
    email: data.email,
    password: await bcrypt.hash(data.password, 10),
    role: data.role,
    assignedBranch: data.branchId ?? null,
    isActive: true,
  })
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
  })
  console.log(`Admin ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)

  for (const branch of branches) {
    const manager = await getOrCreateUser({
      name: `Manager — ${branch.name}`,
      email: `${branch.code}@wyndells.com`,
      password: MANAGER_PASSWORD,
      role: 'manager',
      branchId: String(branch._id),
    })
    console.log(`Manager ready: ${manager.email} / ${MANAGER_PASSWORD}`)
  }
  return branches
}

async function seedBranchContent() {
  const branches = await BranchModel.find().lean()
  for (const branch of branches) {
    // Tables
    const tableCount = await DiningTableModel.countDocuments({ branch: branch._id })
    if (tableCount === 0) {
      const tables = TABLE_TEMPLATE.map((table) => ({
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        branch: branch._id,
      }))
      await DiningTableModel.insertMany(tables)
      console.log(`  ${branch.name}: ${tables.length} tables added`)
    } else {
      console.log(`  ${branch.name}: ${tableCount} tables already present`)
    }

    // Menu
    const menuCount = await MenuItemModel.countDocuments({ branch: branch._id })
    if (menuCount === 0) {
      const items = MENU_TEMPLATE.map((item) => ({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        isFeatured: item.isFeatured,
        status: 'available',
        branch: branch._id,
      }))
      await MenuItemModel.insertMany(items)
      console.log(`  ${branch.name}: ${items.length} menu items added`)
    } else {
      console.log(`  ${branch.name}: ${menuCount} menu items already present`)
    }
  }
  return branches
}

async function seedSamples() {
  const branches = await BranchModel.find().lean()
  const today = todayString()

  for (const branch of branches) {
    const tables = await DiningTableModel.find({ branch: branch._id }).sort({ capacity: 1 }).limit(4).lean()
    const tableFor = (index: number) => (tables[index % Math.max(tables.length, 1)]?._id ?? null)

    const sampleReservations: {
      reference: string
      branch: mongoose.Types.ObjectId
      customerName: string
      email: string
      contactNumber: string
      date: string
      time: string
      guests: number
      specialRequests: string
      status: 'pending' | 'confirmed' | 'rejected' | 'cancelled' | 'completed' | 'no-show'
      table: mongoose.Types.ObjectId | null
      statusHistory: { status: string; note: string; changedAt?: Date }[]
    }[] = [
      {
        reference: `WYN-SEED${1}`, branch: branch._id,
        customerName: 'Ana Villanueva', email: 'ana.v@example.com', contactNumber: '0917 555 0101',
        date: addDays(today, -2), time: '18:30', guests: 4, specialRequests: 'Window seat please',
        status: 'completed', table: tableFor(0),
        statusHistory: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date() },
          { status: 'completed', note: 'Guest visited', changedAt: new Date() },
        ],
      },
      {
        reference: `WYN-SEED${2}`, branch: branch._id,
        customerName: 'Carlo Mercado', email: 'carlo.m@example.com', contactNumber: '0917 555 0202',
        date: addDays(today, -1), time: '12:00', guests: 2, specialRequests: '',
        status: 'cancelled', table: tableFor(1),
        statusHistory: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date() },
          { status: 'cancelled', note: 'Customer cancelled', changedAt: new Date() },
        ],
      },
      {
        reference: `WYN-SEED${3}`, branch: branch._id,
        customerName: 'Nica Dimagiba', email: 'nica.d@example.com', contactNumber: '0917 555 0303',
        date: addDays(today, 1), time: '17:30', guests: 6, specialRequests: 'Birthday dessert surprise!',
        status: 'confirmed', table: tableFor(2),
        statusHistory: [
          { status: 'pending', note: 'Reservation submitted' },
          { status: 'confirmed', note: 'Confirmed by staff', changedAt: new Date() },
        ],
      },
      {
        reference: `WYN-SEED${4}`, branch: branch._id,
        customerName: 'Rico Manalang', email: 'rico.m@example.com', contactNumber: '0917 555 0404',
        date: addDays(today, 2), time: '19:00', guests: 3, specialRequests: '',
        status: 'pending', table: null,
        statusHistory: [{ status: 'pending', note: 'Reservation submitted' }],
      },
    ]

    for (const sample of sampleReservations) {
      const exists = await ReservationModel.exists({ reference: sample.reference })
      if (!exists) {
        await ReservationModel.create(sample)
      }
    }

    const feedbackCount = await FeedbackModel.countDocuments({ branch: branch._id })
    if (feedbackCount === 0) {
      for (let index = 0; index < 4; index += 1) {
        await FeedbackModel.create({
          branch: branch._id,
          customerName: FEEDBACK_NAMES[index % FEEDBACK_NAMES.length],
          contactNumber: `0917 555 100${index}`,
          rating: 4 + (index % 2),
          comment: SAMPLE_COMMENTS[index % SAMPLE_COMMENTS.length],
          reservationReference: `WYN-SEED${index + 1}`,
        })
      }
      console.log(`  ${branch.name}: sample feedback added`)
    }
    console.log(`  ${branch.name}: sample reservations + feedback checked`)
  }
}

async function main() {
  await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 })
  console.log(`Connected to ${URI}`)

  await seedBranchesAndUsers()
  await seedBranchContent()
  await seedSamples()

  console.log('Seed complete ✔')
  await mongoose.disconnect()
}

try {
  await main()
} catch (error) {
  console.error('Seeding failed:', error)
  process.exitCode = 1
}