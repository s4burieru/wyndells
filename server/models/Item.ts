import { Schema, model, type InferSchemaType } from 'mongoose'

const itemSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
)

export type Item = InferSchemaType<typeof itemSchema>

export const ItemModel = model<Item>('Item', itemSchema)