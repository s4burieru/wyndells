/**
 * Platform roles. `hr` was added alongside the permission matrix (migration
 * 0006) — keep in sync with `USER_ROLES` in `server/src/constants/index.ts`.
 */
export type Role = 'admin' | 'manager' | 'hr'

/**
 * A single capability a role can hold. Keep in sync with `PERMISSIONS` in
 * `server/src/constants/permissions.ts` — the server owns the truth and
 * hands the current grants to the client on `/api/auth/me`.
 */
export type Permission =
  | 'roles.manage'
  | 'branches.manage'
  | 'users.view'
  | 'users.manage'
  | 'activity.view'
  | 'reservations.manage'
  | 'tables.manage'
  | 'menu.manage'
  | 'feedback.view'
  | 'feedback.delete'
  | 'promotions.manage'
  | 'customers.view'
  | 'customers.delete'
  | 'careers.manage'
  | 'careers.delete'
  | 'reports.view'
  | 'reports.branch_performance'
  | 'chat.use'
  | 'directory.view'

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
  /** Profile details — job title, contact number, address, photo and bio. */
  position: string
  contactNumber: string
  address: string
  avatarUrl: string
  bio: string
  /** What this account's role may currently do — drives every client gate. */
  permissions: Permission[]
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

// ---------------------------------------------------------------------------
// Promotions & newsletter
// ---------------------------------------------------------------------------

/** Card flavours the home page can render. Keep in sync with `promotion_kind`. */
export type PromotionKind = 'promotion' | 'event' | 'announcement'

/** A home-page promotion, event or announcement. */
export type Promotion = {
  _id: string
  /** null = restaurant-wide (shown for every branch). */
  branch: BranchRef | null
  kind: PromotionKind
  title: string
  summary: string
  image: string
  /** YYYY-MM-DD displayed on the card. */
  eventDate: string
  /** YYYY-MM-DD visibility window; either end may be open. */
  startsOn: string | null
  expiresOn: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

/** Where a newsletter signup came from — the home-page section or the popup. */
export type NewsletterSource = 'homepage' | 'popup'

export type NewsletterSubscriber = {
  _id: string
  name: string
  email: string
  source: NewsletterSource
  createdAt: string
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
  /** HR receives the all-branches shape, so its role tags along too. */
  role: 'admin' | 'hr'
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

/**
 * The all-branches overview shape. Both administrators and HR receive it, so
 * key off the payload rather than the `role` tag.
 */
export type AllBranchesOverview = Extract<Overview, { branchPerformance: BranchPerformance[] }>

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

// ---------------------------------------------------------------------------
// Notifications & activity log
// ---------------------------------------------------------------------------

export type NotificationType =
  | 'reservation_new'
  | 'reservation_status'
  | 'table_assigned'
  | 'feedback_new'
  | 'application_new'
  | 'application_status'
  | 'staff_created'
  | 'welcome'

export type AppNotification = {
  _id: string
  type: NotificationType
  title: string
  body: string
  /** Dashboard route opened on click; empty when there is nothing to open. */
  link: string
  isRead: boolean
  branch: BranchRef | null
  createdAt: string
}

export type NotificationListResult = {
  notifications: AppNotification[]
  total: number
  unread: number
}

export type ActivityEntry = {
  _id: string
  /** Stable machine name, e.g. `reservation.status_changed`. */
  action: string
  summary: string
  entity: string
  entityId: string
  actor: { _id: string; name: string; role: Role } | null
  branch: BranchRef | null
  createdAt: string
}

export type ActivityListResult = {
  activities: ActivityEntry[]
  total: number
}

// ---------------------------------------------------------------------------
// Staff chat
// ---------------------------------------------------------------------------

export type ChatConversationType = 'direct' | 'group'
export type ChatMemberRole = 'owner' | 'admin' | 'member'

/** The slim user shape embedded in chat payloads. */
export type ChatUserRef = {
  id: string
  name: string
  role: Role
  avatarUrl: string
}

export type ChatParticipant = ChatUserRef & {
  memberRole: ChatMemberRole
  /** When this person last opened the conversation — drives read receipts. */
  lastReadAt: string
}

export type ChatAttachment = {
  url: string
  name: string
  mime: string
  size: number
}

/** 'system' rows are event lines written by the API ("Alice left the group"). */
export type ChatMessageKind = 'text' | 'image' | 'file' | 'system'

export type ChatMessage = {
  _id: string
  conversationId: string
  sender: ChatUserRef
  kind: ChatMessageKind
  body: string
  attachment: ChatAttachment | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
}

export type ChatConversation = {
  _id: string
  type: ChatConversationType
  /** Group name; empty for direct conversations (use the other participant). */
  title: string
  /** Group photo URL; '' for direct chats and groups without a photo. */
  imageUrl: string
  participants: ChatParticipant[]
  lastMessage: ChatMessage | null
  unread: number
  createdAt: string
}

export type ChatMessagesResult = { messages: ChatMessage[]; hasMore: boolean }

export type ChatUnreadSummary = {
  total: number
  conversations: { id: string; unread: number }[]
}
