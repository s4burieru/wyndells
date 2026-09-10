import { Schema, model, Types, type InferSchemaType } from 'mongoose'
import { TABLE_STATUSES } from '../constants'

const diningTableSchema = new Schema(
  {
    branch: { type: Types.ObjectId, ref: 'Branch', required: true, index: true },
    tableNumber: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1, max: 50 },
    location: { type: String, default: 'Main Hall', trim: true },
    status: { type: String, enum: TABLE_STATUSES, default: 'available' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
)

diningTableSchema.index({ branch: 1, tableNumber: 1 }, { unique: true })

export type DiningTable = InferSchemaType<typeof diningTableSchema>

export const DiningTableModel = model<DiningTable>('DiningTable', diningTableSchema)