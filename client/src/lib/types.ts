export type Role = 'admin' | 'manager'

export type Branch = {
  _id: string
  name: string
  code: string
  address: string
  city: string
  contactNumber: string
  email: string
  hours: string
  description: string
  image: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SafeUser = {
  id: string
  name: string
  email: string
  role: Role
  isActive: boolean
  assignedBranch: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
}

export type BranchRef = { _id: string; name: string; code: string }

export type TableStatus = 'available' | 'reserved' | 'occupied' | 'cleaning' | 'unavailable'

export type DiningTable = {
  _id: string
  branch: BranchRef
  tableNumber: string
  capacity: number
  location: string
  status: TableStatus
  isActive: boolean
}

export type MenuCategory =
  | 'Appetizers'
  | 'Main Courses'
  | 'Rice Meals'
  | 'Drinks'
  | 'Desserts'
  | 'Others'

export type MenuItem = {
  _id: string
  branch: BranchRef
  name: string
  description: string
  price: number
  category: MenuCategory
  image: string
  status: 'available' | 'unavailable'
  isFeatured: boolean
}

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'no-show'

export type TableRef = {
  _id: string
  tableNumber: string
  capacity: number
  location: string
  status: TableStatus
}

export type ReservationStatusEntry = {
  status: ReservationStatus
  changedBy: string | null
  changedAt: string
  note: string
}

export type Reservation = {
  _id: string
  reference: string
  branch: BranchRef
  table: TableRef | null
  customerName: string
  email: string
  contactNumber: string
  date: string
  time: string
  guests: number
  specialRequests: string
  status: ReservationStatus
  statusHistory: ReservationStatusEntry[]
  createdAt: string
  updatedAt: string
}

export type FeedbackSummary = {
  _id: string
  customerName: string
  rating: number
  comment: string
  branch: BranchRef
  createdAt: string
}

export type Feedback = FeedbackSummary & {
  contactNumber: string
  email: string
  reservationReference: string
}

export type TimeSlot = { time: string; availableSpots: number }

export type ReservationTrendPoint = {
  date: string
  total: number
  confirmed: number
  completed: number
}

export type BranchPerformance = {
  branch: { id: string; name: string; code: string; city: string }
  reservations: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  rejected: number
  noShow: number
  completionRate: number
  averageRating: number
  feedbackCount: number
}

export type ManagerOverview = {
  role: 'manager'
  today: { reservations: number; confirmed: number }
  counts: Record<ReservationStatus, number>
  tables: Record<TableStatus, number>
  feedback: { count: number; averageRating: number }
  trend: ReservationTrendPoint[]
  upcoming: Reservation[]
  recentFeedback: FeedbackSummary[]
  scope: { branchId: string; branchName: string; branchCode: string }
}

export type AdminOverview = {
  role: 'admin'
  today: { reservations: number; confirmed: number }
  counts: Record<ReservationStatus, number>
  tables: Record<TableStatus, number>
  feedback: { count: number; averageRating: number }
  trend: ReservationTrendPoint[]
  upcoming: Reservation[]
  recentFeedback: FeedbackSummary[]
  scope: { branchId: null; branchName: string }
  branchPerformance: BranchPerformance[]
  totals: { branches: number; managers: number }
}

export type Overview = ManagerOverview | AdminOverview

export type ReservationListResult = { reservations: Reservation[]; total: number }

export type CareerDepartment = 'restaurant' | 'cafe'
export type PostingStatus = 'open' | 'closed'
export type ApplicationStatus = 'new' | 'reviewed' | 'shortlisted' | 'hired' | 'rejected'

/** Job posting as shown on the public careers page. */
export type CareerPosting = {
  _id: string
  branch: BranchRef
  title: string
  department: CareerDepartment
  employmentType: string
  summary: string
  description: string
  requirements: string
  createdAt: string
}

/** Staff view of a posting — includes the moderation status. */
export type ManageableCareerPosting = CareerPosting & {
  status: PostingStatus
  updatedAt: string
}

export type CareerPostingRef = { _id: string; title: string; department: CareerDepartment }

export type JobApplication = {
  _id: string
  posting: CareerPostingRef
  branch: BranchRef
  fullName: string
  email: string
  contactNumber: string
  coverLetter: string
  resumeUrl: string
  status: ApplicationStatus
  notes: string
  createdAt: string
  updatedAt: string
}