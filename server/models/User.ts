import { Schema, model, Types, type InferSchemaType } from 'mongoose'
import { USER_ROLES } from '../constants'

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // select: false keeps the hash out of normal queries.
    password: { type: String, required: true, select: false },
    role: { type: String, required: true, enum: USER_ROLES, default: 'manager' },
    assignedBranch: { type: Types.ObjectId, ref: 'Branch', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

// Never leak the password hash through JSON serialization.
userSchema.set('toJSON', {
  transform(_doc: unknown, ret: Record<string, unknown>) {
    delete ret.password
    delete ret.__v
  },
})

export type User = InferSchemaType<typeof userSchema>

export const UserModel = model<User>('User', userSchema)