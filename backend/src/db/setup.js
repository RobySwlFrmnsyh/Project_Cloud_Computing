import { config } from '../config.js'
import { ensureEmbeddedDatabase } from './embedded.js'
import { runMigrations } from './migrate.js'
import { databaseIsEmpty, seedDemoData } from './seed.js'

export async function setupDatabase({ seed = config.seedDemo } = {}) {
  await ensureEmbeddedDatabase()
  await runMigrations()

  if (seed && (await databaseIsEmpty())) {
    const result = await seedDemoData()
    console.log(`[db] data demo dimuat: ${result.users} pengguna, ${result.bookings} pesanan.`)
  }
}
