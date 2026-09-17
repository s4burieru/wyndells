import type { UserRole } from '../constants'

export const usersTable = 'users'

/** Row shape as stored in the Supabase `users` table. */
export type UserRow = {
  id: string
  name: string
  email: string
  password_hash: string
  role: UserRole
  assigned_branch_id: string | null
  is_active: boolean
  /** Profile details (see supabase/migrations/0003_user_profiles.sql). */
  position: string
  contact_number: string
  address: string
  avatar_url: string
  bio: string
  created_at: string
  updated_at: string
}

/** A user row with the embedded branch name from the `assigned_branch` foreign key. */
export type UserWithBranchRow = UserRow & { assigned_branch: { name: string } | null }