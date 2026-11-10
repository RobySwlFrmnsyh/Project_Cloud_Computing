export function createRateLimiter({ windowMs, max, message }) {
  const buckets = new Map()
  const cleanup = setInterval(() => {
    const now = Date.now()
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key)
    }
  }, Math.max(windowMs, 60_000))
  cleanup.unref()

  return function rateLimit(req, res, next) {
    const key = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const now = Date.now()
    let bucket = buckets.get(key)

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs }
      buckets.set(key, bucket)
    }

    bucket.count += 1
    res.setHeader('RateLimit-Limit', max)
    res.setHeader('RateLimit-Remaining', Math.max(0, max - bucket.count))
    res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000))

    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000))
      res.status(429).json({
        success: false,
        message: message ?? 'Terlalu banyak permintaan. Coba lagi nanti.',
        errors: null,
      })
      return
    }

    next()
  }
}
