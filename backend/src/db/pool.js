import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
})

pool.on('error', (error) => {
  console.error('[db] koneksi idle gagal:', error.message)
})

export function query(text, params) {
  return pool.query(text, params)
}

export async function withTransaction(handler) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await handler(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closePool() {
  await pool.end()
}
