import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const baseUrl = (process.env.APP_URL ?? 'http://localhost:8080').replace(/\/+$/, '')
const outputDir = fileURLToPath(new URL('../docs/screenshots/', import.meta.url))
const chromeBin = process.env.CHROME_BIN ?? 'chromium'
const debugPort = Number(process.env.CHROME_DEBUG_PORT ?? 9222)
const profileDir = join(tmpdir(), `projectcc-chrome-${process.pid}`)
const password = process.env.DEMO_PASSWORD ?? 'demo1234'

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

function cookieValue(response) {
  const values = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')]
  const raw = values.filter(Boolean)[0]
  if (!raw) throw new Error('Server tidak mengirim cookie sesi.')
  return raw.split(';')[0]
}

async function login(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(`Login ${email} gagal (${response.status}).`)
  return cookieValue(response)
}

async function customerPaymentPath(cookie) {
  const response = await fetch(`${baseUrl}/api/bookings`, { headers: { Cookie: cookie } })
  if (!response.ok) throw new Error('Gagal mengambil daftar pesanan customer.')
  const body = await response.json()
  const bookings = body.data.bookings ?? []
  const paid = bookings.find((booking) => booking.payment_status === 'paid')
  return paid
    ? { path: `/app/bookings/${paid.id}/payment`, expected: `Pembayaran ${paid.id}` }
    : { path: '/app/history', expected: 'Riwayat pesanan' }
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
  await mkdir(outputDir, { recursive: true })
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
    const webSocketUrl = await waitForDebugTarget()
    cdp = new Cdp(webSocketUrl)
    await cdp.connect()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    })

    const text = async () => {
      const result = await cdp.send('Runtime.evaluate', {
        expression: 'document.body?.innerText ?? ""',
        returnByValue: true,
      })
      return result.result.value
    }

    const waitForText = async (expected, timeout = 12000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        if ((await text()).includes(expected)) return
        await delay(250)
      }
      throw new Error(`Teks "${expected}" tidak muncul di halaman.`)
    }

    const setSession = async (cookie) => {
      await cdp.send('Network.clearBrowserCookies')
      if (!cookie) return
      const separator = cookie.indexOf('=')
      const result = await cdp.send('Network.setCookie', {
        name: cookie.slice(0, separator),
        value: cookie.slice(separator + 1),
        url: `${baseUrl}/`,
        path: '/',
        httpOnly: true,
        sameSite: 'Lax',
      })
      if (!result.success) throw new Error('Gagal memasang cookie sesi di Chromium.')
    }

    const capture = async ({ file, expected, wait = 2500, action }) => {
      await waitForText(expected)
      await cdp.send('Runtime.evaluate', {
        expression: 'document.fonts.ready',
        awaitPromise: true,
      })
      if (action) await action()
      await delay(wait)
      await cdp.send('Runtime.evaluate', {
        expression: 'window.scrollTo(0, 0)',
        returnByValue: true,
      })
      const screenshot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        fromSurface: true,
        captureBeyondViewport: false,
      })
      await writeFile(join(outputDir, file), Buffer.from(screenshot.data, 'base64'))
      console.log(`[ok] ${file}`)
    }

    const waitForPath = async (path, timeout = 12000) => {
      const deadline = Date.now() + timeout
      while (Date.now() < deadline) {
        const result = await cdp.send('Runtime.evaluate', {
          expression: 'location.pathname',
          returnByValue: true,
        })
        if (result.result.value === path) return
        await delay(250)
      }
      throw new Error(`Path "${path}" tidak tercapai.`)
    }

    const uiLogin = async (email, expectedPath) => {
      await cdp.send('Page.navigate', { url: `${baseUrl}/login` })
      await waitForText('Selamat datang kembali')
      await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const setValue = (selector, value) => {
            const input = document.querySelector(selector)
            const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
            setter.call(input, value)
            input.dispatchEvent(new Event('input', { bubbles: true }))
          }
          setValue('#login-email', ${JSON.stringify(email)})
          setValue('#login-password', ${JSON.stringify(password)})
          document.querySelector('.auth__form').requestSubmit()
          return true
        })()`,
        returnByValue: true,
      })
      await waitForPath(expectedPath)
    }

    const visit = async ({ file, cookie, path, expected, wait = 2500, action }) => {
      await setSession(cookie)
      await cdp.send('Page.navigate', { url: `${baseUrl}${path}` })
      await capture({ file, expected, wait, action })
    }

    const spaVisit = async ({ file, path, expected, wait = 2500, action }) => {
      await cdp.send('Runtime.evaluate', {
        expression: `history.pushState({}, '', ${JSON.stringify(path)});dispatchEvent(new PopStateEvent('popstate'))`,
        returnByValue: true,
      })
      await delay(300)
      await capture({ file, expected, wait, action })
    }

    const customer = await login('customer@demo.app')
    const payment = await customerPaymentPath(customer)

    await visit({ file: '01-login.png', path: '/login', expected: 'Masuk', wait: 1200 })
    await uiLogin('customer@demo.app', '/app')
    await spaVisit({
      file: '02-customer-dashboard.png',
      path: '/app',
      expected: 'Halo,',
      wait: 3500,
    })
    await spaVisit({
      file: '03-create-booking.png',
      path: '/app/bookings/new',
      expected: 'Buat pesanan perjalanan',
      wait: 3500,
    })
    await spaVisit({
      file: '04-payment-cash.png',
      path: payment.path,
      expected: payment.expected,
      wait: 2000,
    })
    await uiLogin('driver@demo.app', '/driver')
    await spaVisit({
      file: '05-driver-dashboard.png',
      path: '/driver',
      expected: 'Halo,',
      wait: 3000,
    })
    await uiLogin('admin@demo.app', '/admin')
    await spaVisit({
      file: '06-admin-dashboard.png',
      path: '/admin',
      expected: 'Dashboard admin',
      wait: 3500,
    })
    await spaVisit({
      file: '07-admin-bookings.png',
      path: '/admin',
      expected: 'Dashboard admin',
      wait: 1800,
      action: async () => {
        await cdp.send('Runtime.evaluate', {
          expression:
            "Array.from(document.querySelectorAll('button')).find((button) => button.textContent.includes('Pesanan'))?.click()",
        })
        await waitForText('RUTE')
      },
    })

    await uiLogin('customer@demo.app', '/app')
    await spaVisit({
      file: '09-notifications.png',
      path: '/app/notifications',
      expected: 'Pemberitahuan akun',
      wait: 2000,
    })

    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    })
    await spaVisit({
      file: '08-customer-mobile.png',
      path: '/app',
      expected: 'Halo,',
      wait: 2500,
    })

    console.log(`Screenshot tersimpan di ${outputDir}`)
  } finally {
    cdp?.close()
    chrome.kill('SIGTERM')
    await new Promise((resolve) => {
      chrome.once('exit', resolve)
      setTimeout(resolve, 2000)
    })
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
  }
}

await main()
