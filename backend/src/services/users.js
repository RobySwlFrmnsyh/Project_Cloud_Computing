import { query, pool } from '../db/pool.js'
import { serializeUser } from '../lib/serializers.js'

export const USER_SELECT = `
  SELECT u.*,
         dp.vehicle_type,
         dp.vehicle_plate,
         dp.verification_status,
         dp.availability_status,
         dp.rating,
         dp.total_trips,
         dp.verified_at
  FROM users u
  LEFT JOIN driver_profiles dp ON dp.user_id = u.id
`

export async function findUserById(id, executor = pool) {
  if (!/^\d+$/.test(String(id))) return null

  const result = await executor.query(`${USER_SELECT} WHERE u.id = $1`, [id])
  return result.rows[0] ? serializeUser(result.rows[0]) : null
}

export async function findUserCredentialsByEmail(email) {
  const result = await query(
    `SELECT id, password_hash FROM users WHERE lower(email) = lower($1)`,
    [email],
  )
  return result.rows[0] ?? null
}

export async function listUsers({ role } = {}) {
  const params = []
  let where = ''
  if (role) {
    params.push(role)
    where = 'WHERE u.role = $1'
  }

  const result = await query(`${USER_SELECT} ${where} ORDER BY u.created_at ASC`, params)
  return result.rows.map(serializeUser)
}

export async function listUsersPage({ role, page, limit } = {}) {
  const params = []
  let where = ''
  if (role) {
    params.push(role)
    where = 'WHERE u.role = $1'
  }

  const paginated = Boolean(page || limit)
  const currentPage = page ?? 1
  const pageSize = limit ?? 20
  let sql = `${USER_SELECT} ${where} ORDER BY u.created_at ASC`
  const values = [...params]

  if (paginated) {
    values.push(pageSize, (currentPage - 1) * pageSize)
    sql += ` LIMIT $${values.length - 1} OFFSET $${values.length}`
  }

  const result = await query(sql, values)
  let pagination = null

  if (paginated) {
    const count = await query(`SELECT COUNT(*)::int AS total FROM users u ${where}`, params)
    const total = count.rows[0].total
    pagination = {
      page: currentPage,
      limit: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
    }
  }

  return {
    users: result.rows.map(serializeUser),
    pagination,
  }
}
