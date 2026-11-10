import http from 'node:http'
import app from './app.js'
import { config } from './config.js'
import { closeRealtime, initRealtime } from './lib/realtime.js'
import { stopEmbeddedDatabase } from './db/embedded.js'
import { closePool } from './db/pool.js'
import { setupDatabase } from './db/setup.js'

async function main() {
  await setupDatabase()

  const server = http.createServer(app)
  initRealtime(server)

  server.listen(config.port, config.bindHost, () => {
    console.log(`[api] Anter Jemput Teman berjalan di http://${config.bindHost}:${config.port}`)
    console.log(`[api] Mode: ${config.nodeEnv} · Database: ${mask(config.databaseUrl)}`)
  })

  let shuttingDown = false

  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n[api] menerima ${signal}, menghentikan server...`)

    const forceExit = setTimeout(() => {
      console.error('[api] penghentian paksa.')
      process.exit(1)
    }, 10_000)
    forceExit.unref()

    closeRealtime().finally(() => {
      server.close(async () => {
        try {
          await closePool()
          await stopEmbeddedDatabase()
        } finally {
          clearTimeout(forceExit)
          process.exit(0)
        }
      })
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

function mask(value) {
  try {
    const url = new URL(value)
    if (url.password) url.password = '***'
    return url.toString()
  } catch {
    return '(tidak valid)'
  }
}

main().catch((error) => {
  console.error('[api] gagal menjalankan server:', error)
  process.exit(1)
})
