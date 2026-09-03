import { Router } from 'express'
import { ItemModel } from '../models/Item'

const router = Router()

// GET /api/items — list all items
router.get('/', async (_req, res) => {
  try {
    const items = await ItemModel.find().sort({ createdAt: -1 })
    res.json(items)
  } catch (error) {
    console.error('Failed to fetch items', error)
    res.status(500).json({ message: 'Failed to fetch items' })
  }
})

// GET /api/items/:id — get a single item
router.get('/:id', async (req, res) => {
  try {
    const item = await ItemModel.findById(req.params.id)
    if (!item) {
      res.status(404).json({ message: 'Item not found' })
      return
    }
    res.json(item)
  } catch (error) {
    console.error('Failed to fetch item', error)
    res.status(500).json({ message: 'Failed to fetch item' })
  }
})

// POST /api/items — create an item
router.post('/', async (req, res) => {
  try {
    const item = await ItemModel.create(req.body)
    res.status(201).json(item)
  } catch (error) {
    console.error('Failed to create item', error)
    res.status(400).json({ message: 'Failed to create item' })
  }
})

// PUT /api/items/:id — update an item
router.put('/:id', async (req, res) => {
  try {
    const item = await ItemModel.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!item) {
      res.status(404).json({ message: 'Item not found' })
      return
    }
    res.json(item)
  } catch (error) {
    console.error('Failed to update item', error)
    res.status(500).json({ message: 'Failed to update item' })
  }
})

// DELETE /api/items/:id — delete an item
router.delete('/:id', async (req, res) => {
  try {
    const item = await ItemModel.findByIdAndDelete(req.params.id)
    if (!item) {
      res.status(404).json({ message: 'Item not found' })
      return
    }
    res.json({ message: 'Item deleted' })
  } catch (error) {
    console.error('Failed to delete item', error)
    res.status(500).json({ message: 'Failed to delete item' })
  }
})

export default router