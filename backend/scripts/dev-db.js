import { stopEmbeddedDatabase } from '../src/db/embedded.js'
import { closePool } from '../src/db/pool.js'
import { setupDatabase } from '../src/db/setup.js'

async function main() {
  await setupDatabase()
  console.log('[db] siap dipakai. Tekan Ctrl+C untuk berhenti.')

  const shutdown = async () => {
    await closePool()
    await stopEmbeddedDatabase()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((error) => {
  console.error('[db] gagal menjalankan database:', error)
  process.exit(1)
})
