import mongoose from 'mongoose'

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/wyndells'

const CONNECTION_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'] as const

export function getDbState(): string {
  const state = mongoose.connection.readyState as number
  return CONNECTION_STATES[state] ?? 'unknown'
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || DEFAULT_URI

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`)
  } catch (error) {
    // Start the API anyway so the frontend can still be worked on.
    console.error(
      `MongoDB connection failed (${uri}). The API will run without a database.`,
      error,
    )
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect()
}