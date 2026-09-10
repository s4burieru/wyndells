import { Schema, model, Types, type InferSchemaType } from 'mongoose'
import { RESERVATION_STATUSES } from '../constants'

const statusHistoryEntrySchema = new Schema(
  {
    status: { type: String, required: true, enum: RESERVATION_STATUSES },
    changedBy: { type: Types.ObjectId, ref: 'User', default: null },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, default: '', trim: true },
  },
  { _id: false },
)

const reservationSchema = new Schema(
  {
    reference: { type: String, required: true, unique: true, trim: true, uppercase: true },
    branch: { type: Types.ObjectId, ref: 'Branch', required: true, index: true },
    table: { type: Types.ObjectId, ref: 'DiningTable', default: null },
    customerName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    contactNumber: { type: String, required: true, trim: true },
    // Stored as YYYY-MM-DD so all availability logic is timezone-safe and string-comparable.
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    // 24-hour time, e.g. "18:30".
    time: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    guests: { type: Number, required: true, min: 1, max: 50 },
    specialRequests: { type: String, default: '', trim: true },
    status: { type: String, enum: RESERVATION_STATUSES, default: 'pending' },
    statusHistory: { type: [statusHistoryEntrySchema], default: [] },
  },
  { timestamps: true },
)

reservationSchema.index({ branch: 1, date: 1, time: 1 })
reservationSchema.index({ reference: 1 }, { unique: true })

export type Reservation = InferSchemaType<typeof reservationSchema>

export const ReservationModel = model<Reservation>('Reservation', reservationSchema)