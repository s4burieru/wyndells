import { Schema, model, type InferSchemaType } from 'mongoose'

const branchSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    address: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    contactNumber: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    hours: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export type Branch = InferSchemaType<typeof branchSchema>

export const BranchModel = model<Branch>('Branch', branchSchema)