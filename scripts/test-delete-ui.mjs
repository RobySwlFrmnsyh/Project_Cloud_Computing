import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const baseUrl = (process.env.APP_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const chromeBin = process.env.CHROME_BIN ?? 'chromium'
const debugPort = Number(process.env.CHROME_DEBUG_PORT ?? 9223)
const password = process.env.DEMO_PASSWORD ?? 'demo1234'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function cookieValue(response) {
  const values = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')]
  const raw = values.filter(Boolean)[0]
  assert(raw, 'Server tidak mengirim cookie sesi.')
  return raw.split(';')[0]
}

async function api(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options)
  let body = null
  try {
    body = await response.json()
  } catch {
    body = null
  }
  return { response, body }
}

async function login(email) {
  const { response } = await api('/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert(response.status === 200, `Login ${email} gagal (${response.status}).`)
  return cookieValue(response)
}

async function prepareCancelledBooking(cookie) {
  const created = await api('/api/bookings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      pickup: {
        address: 'Dago Pakar, Bandung',
        lat: -6.8432,
        lng: 107.6188,
      },
      destination: {
        address: 'Paris Van Java, Bandung',
        lat: -6.8916,
        lng: 107.5937,
      },
      vehicle_type: 'motor',
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      notes: 'Uji hapus UI otomatis.',
    }),
  })
  assert(created.response.status === 201, `Gagal membuat pesanan (${created.response.status}).`)
  const code = created.body.data.booking.id

  const cancelled = await api(`/api/bookings/${code}/cancel`, {
    method: 'POST',
    headers: { Cookie: cookie },
  })
  assert(cancelled.response.status === 200, `Gagal membatalkan pesanan (${cancelled.response.status}).`)
  return code
}

class Cdp {
  constructor(url) {
    this.url = url
    this.id = 0
    this.pending = new Map()
  }

  async connect() {
    this.ws = new WebSocket(this.url)
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true })
      this.ws.addEventListener('error', reject, { once: true })
    })
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data)
      if (!message.id) return
      const pending = this.pending.get(message.id)
      if (!pending) return
      this.pending.delete(message.id)
      if (message.error) pending.reject(new Error(message.error.message))
      else pending.resolve(message.result)
    })
  }

  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
    })
  }

  close() {
    this.ws?.close()
  }
}

async function waitForDebugTarget() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`)
      const targets = await response.json()
      const page = targets.find((target) => target.type === 'page')
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl
    } catch {}
    await delay(250)
  }
  throw new Error('Chromium tidak membuka endpoint debugging.')
}

async function main() {
  const customer = await login('customer@demo.app')
  const code = await prepareCancelledBooking(customer)
  console.log(`[ok] pesanan ${code} siap diuji dari UI`)

  const profileDir = await mkdtemp(join(tmpdir(), 'projectcc-delete-ui-'))
  const chrome = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      '--window-size=1440,1000',
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  let cdp
  try {
    cdp = new Cdp(await waitForDebugTarget())
    await cdp.connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')

    await cdp.send('Network.clearBrowserCookies')

    const evaluate = async (expression, awaitPromise = false) => {
      const result = await cdp.send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise,
      })
      return result.result.value
    }

    const waitFor = async (expression, label, timeout = 15000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        if (await evaluate(expression)) return
        await delay(250)
      }
      throw new Error(`Kondisi "${label}" tidak terpenuhi.`)
    }

    await cdp.send('Page.navigate', { url: `${baseUrl}/login` })
    await waitFor("Boolean(document.querySelector('.auth__form'))", 'form login tampil')
    await evaluate(`(() => {
      const setValue = (selector, value) => {
        const input = document.querySelector(selector)
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
        setter.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      setValue('#login-email', 'customer@demo.app')
      setValue('#login-password', ${JSON.stringify(password)})
      document.querySelector('.auth__form').requestSubmit()
      return true
    })()`)
    await waitFor("window.location.pathname === '/app'", 'login customer berhasil')

    await evaluate(
      `history.pushState({}, '', '/app/bookings/${code}');dispatchEvent(new PopStateEvent('popstate'))`,
    )
    await waitFor(
      `document.body?.innerText.includes(${JSON.stringify(code)})`,
      'detail pesanan tampil',
    )
    await waitFor(
      "Array.from(document.querySelectorAll('button')).some((button) => button.textContent.includes('Hapus permanen'))",
      'tombol hapus tampil',
    )

    await evaluate(
      "Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Hapus permanen'))?.click()",
    )
    await waitFor(
      "document.body?.innerText.includes('Hapus pesanan permanen?')",
      'modal konfirmasi tampil',
    )

    await evaluate(
      "Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Ya, hapus permanen'))?.click()",
    )
    await waitFor(
      "window.location.pathname === '/app/history'",
      'redirect ke riwayat',
    )
    await waitFor(
      "document.body?.innerText.includes('Riwayat')",
      'halaman riwayat tampil',
    )

    const missing = await api(`/api/bookings/${code}`, {
      headers: { Cookie: customer },
    })
    assert(missing.response.status === 404, 'Pesanan masih ada setelah dihapus dari UI.')
    console.log(`[ok] UI hapus permanen ${code} berhasil`)
  } finally {
    cdp?.close()
    chrome.kill('SIGTERM')
    await delay(250)
    await rm(profileDir, { recursive: true, force: true })
  }
}

main().catch((error) => {
  console.error(`[gagal] ${error.message}`)
  process.exitCode = 1
})
