import { HttpError } from './http.js'

/**
 * Memvalidasi body/query dengan skema Zod dan mengubah kegagalan menjadi
 * respons 422 dengan pesan per field.
 */
export function parse(schema, payload) {
  const result = schema.safeParse(payload)

  if (!result.success) {
    const errors = {}
    for (const issue of result.error.issues) {
      const field = issue.path.length > 0 ? issue.path.join('.') : '_'
      if (!errors[field]) errors[field] = issue.message
    }
    throw new HttpError(422, 'Data yang dikirim belum valid.', errors)
  }

  return result.data
}
