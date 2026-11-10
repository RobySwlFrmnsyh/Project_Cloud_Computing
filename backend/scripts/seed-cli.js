import { ensureEmbeddedDatabase, stopEmbeddedDatabase } from '../src/db/embedded.js'
import { runMigrations } from '../src/db/migrate.js'
import { closePool } from '../src/db/pool.js'
import { seedDemoData } from '../src/db/seed.js'

const force = process.argv.includes('--force') || process.argv.includes('-f')

async function main() {
  await ensureEmbeddedDatabase()
  await runMigrations()

  const result = await seedDemoData({ force })

  if (result.seeded) {
    console.log(
      `[db] data demo dimuat: ${result.users} pengguna, ${result.bookings} pesanan, ${result.payments} pembayaran.`,
    )
  } else {
    console.log(
      `[db] database sudah berisi ${result.users} pengguna. Gunakan --force untuk mengisi ulang.`,
    )
  }

  await closePool()
  await stopEmbeddedDatabase()
}

main().catch(async (error) => {
  console.error('[db] seed gagal:', error)
  await closePool().catch(() => {})
  await stopEmbeddedDatabase()
  process.exit(1)
})
