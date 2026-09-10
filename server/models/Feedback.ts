import { Schema, model, Types, type InferSchemaType } from 'mongoose'

const feedbackSchema = new Schema(
  {
    branch: { type: Types.ObjectId, ref: 'Branch', required: true, index: true },
    customerName: { type: String, required: true, trim: true },
    contactNumber: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
    reservationReference: { type: String, default: '', trim: true, uppercase: true },
  },
  { timestamps: true },
)

feedbackSchema.index({ branch: 1, createdAt: -1 })

export type Feedback = InferSchemaType<typeof feedbackSchema>

export const FeedbackModel = model<Feedback>('Feedback', feedbackSchema)