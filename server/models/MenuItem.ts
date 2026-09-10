import { Schema, model, Types, type InferSchemaType } from 'mongoose'
import { MENU_CATEGORIES } from '../constants'

const menuItemSchema = new Schema(
  {
    branch: { type: Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    price: { type: Number, required: true, min: 0 },
    category: { type: String, required: true, enum: MENU_CATEGORIES },
    image: { type: String, default: '', trim: true },
    status: { type: String, enum: ['available', 'unavailable'], default: 'available' },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true },
)

menuItemSchema.index({ branch: 1, category: 1 })

export type MenuItem = InferSchemaType<typeof menuItemSchema>

export const MenuItemModel = model<MenuItem>('MenuItem', menuItemSchema)