import { test, expect } from '@playwright/test'
import { API_URL } from './helpers'

/**
 * Findings API Tests
 */
test.describe('Findings API', () => {

  test('GET /findings accepts category filter', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/findings?category=SECURITY`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
    // All returned findings must be SECURITY category
    for (const f of body) {
      expect(f.category).toBe('SECURITY')
    }
  })

  test('GET /findings accepts severity filter', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/findings?severity=CRITICAL`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    for (const f of body) {
      expect(f.severity).toBe('CRITICAL')
    }
  })

  test('GET /findings respects limit parameter', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/findings?limit=5`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.length).toBeLessThanOrEqual(5)
  })

  test('PATCH /findings/:id/false-positive returns 404 for unknown id', async ({ request }) => {
    const res = await request.patch(
      `${API_URL}/api/v1/findings/00000000-0000-0000-0000-000000000000/false-positive`
    )
    expect(res.status()).toBe(404)
  })

  test('PATCH /findings/:id/resolve returns 404 for unknown id', async ({ request }) => {
    const res = await request.patch(
      `${API_URL}/api/v1/findings/00000000-0000-0000-0000-000000000000/resolve`
    )
    expect(res.status()).toBe(404)
  })
})
