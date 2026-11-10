import { stopEmbeddedDatabase } from '../src/db/embedded.js'
import { ensureEmbeddedDatabase } from '../src/db/embedded.js'
import { runMigrations } from '../src/db/migrate.js'
import { closePool } from '../src/db/pool.js'

async function main() {
  await ensureEmbeddedDatabase()
  await runMigrations()
  console.log('[db] semua migrasi sudah diterapkan.')
  await closePool()
  await stopEmbeddedDatabase()
}

main().catch(async (error) => {
  console.error('[db] migrasi gagal:', error)
  await closePool().catch(() => {})
  await stopEmbeddedDatabase()
  process.exit(1)
})
