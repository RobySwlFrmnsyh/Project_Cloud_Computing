import fs from 'node:fs/promises'
import path from 'node:path'
import pg from 'pg'
import { config } from '../config.js'

const { Client } = pg

let instance = null
let startedByUs = false

function connectionParts() {
  const url = new URL(config.databaseUrl)
  return {
    host: url.hostname || '127.0.0.1',
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || 'postgres'),
    password: decodeURIComponent(url.password || 'postgres'),
    database: decodeURIComponent(url.pathname.replace(/^\//, '') || 'postgres'),
  }
}

function adminClient(parts, database) {
  return new Client({
    host: parts.host,
    port: parts.port,
    user: parts.user,
    password: parts.password,
    database,
  })
}

async function canConnect(parts) {
  const client = adminClient(parts, 'postgres')
  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

/**
 * Dimuat saat dibutuhkan agar image produksi (tanpa devDependencies)
 * tetap bisa berjalan dengan PostgreSQL eksternal.
 */
async function loadEmbeddedPostgres() {
  try {
    const { default: EmbeddedPostgres } = await import('embedded-postgres')
    return EmbeddedPostgres
  } catch {
    throw new Error(
      'Paket embedded-postgres tidak tersedia. Set USE_EMBEDDED_DB=false dan isi DATABASE_URL.',
    )
  }
}

async function ensureDatabase(parts) {
  const client = adminClient(parts, 'postgres')
  await client.connect()
  try {
    const existing = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
      parts.database,
    ])
    if (existing.rowCount === 0) {
      const safeName = parts.database.replace(/"/g, '')
      await client.query(`CREATE DATABASE "${safeName}"`)
      console.log(`[db] database "${parts.database}" dibuat.`)
    }
  } finally {
    await client.end()
  }
}

/**
 * Menjalankan PostgreSQL embedded bila USE_EMBEDDED_DB=true.
 * Bila cluster sudah berjalan (misalnya dari proses dev lain), kita pakai
 * cluster tersebut agar tidak terjadi benturan port.
 */
export async function ensureEmbeddedDatabase() {
  if (!config.useEmbeddedDb) return

  const parts = connectionParts()

  if (await canConnect(parts)) {
    await ensureDatabase(parts)
    console.log(`[db] PostgreSQL sudah berjalan di ${parts.host}:${parts.port}.`)
    return
  }

  const dataExists = await fs
    .access(path.join(config.pgDataDir, 'PG_VERSION'))
    .then(() => true)
    .catch(() => false)

  const EmbeddedPostgres = await loadEmbeddedPostgres()
  instance = new EmbeddedPostgres({
    databaseDir: config.pgDataDir,
    port: parts.port,
    user: parts.user,
    password: parts.password,
    persistent: true,
  })

  if (!dataExists) {
    console.log('[db] inisialisasi cluster PostgreSQL embedded...')
    await instance.initialise()
  }

  console.log(`[db] menjalankan PostgreSQL embedded pada port ${parts.port}...`)
  await instance.start()
  startedByUs = true

  await ensureDatabase(parts)
}

export async function stopEmbeddedDatabase() {
  if (!instance || !startedByUs) return

  try {
    await instance.stop()
    console.log('[db] PostgreSQL embedded dihentikan.')
  } catch (error) {
    console.error('[db] gagal menghentikan PostgreSQL embedded:', error.message)
  } finally {
    instance = null
    startedByUs = false
  }
}
