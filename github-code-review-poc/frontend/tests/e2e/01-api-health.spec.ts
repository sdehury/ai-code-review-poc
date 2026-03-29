import { test, expect } from '@playwright/test'
import { API_URL } from './helpers'

/**
 * API Health & Connectivity Tests
 * Verifies the backend is reachable and endpoints return correct HTTP status codes.
 */
test.describe('API Health Checks', () => {

  test('GET /health returns 200 and healthy status', async ({ request }) => {
    const res = await request.get(`${API_URL}/health`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('healthy')
    expect(body.version).toBeDefined()
  })

  test('GET /api/v1/repositories returns 200 and array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/repositories`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/v1/reviews returns 200 and array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/reviews`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/v1/findings returns 200 and array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/findings`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/v1/developers returns 200 and array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/developers`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('GET /api/v1/dashboard/summary returns valid KPI shape', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/dashboard/summary`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.total_repositories).toBe('number')
    expect(typeof body.total_findings).toBe('number')
    expect(typeof body.critical_findings).toBe('number')
    expect(typeof body.average_score).toBe('number')
    expect(typeof body.total_developers).toBe('number')
  })

  test('GET /api/v1/dashboard/trends returns trend array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/dashboard/trends?days=7`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.trends)).toBe(true)
    expect(body.trends.length).toBe(7)
    const point = body.trends[0]
    expect(typeof point.date).toBe('string')
    expect(typeof point.total).toBe('number')
  })

  test('GET /api/v1/scheduler/status returns scheduler info', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/scheduler/status`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(typeof body.running).toBe('boolean')
    expect(Array.isArray(body.jobs)).toBe(true)
  })

  test('GET unknown endpoint returns 404', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/nonexistent`)
    expect(res.status()).toBe(404)
  })
})
