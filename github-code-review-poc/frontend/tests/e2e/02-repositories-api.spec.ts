import { test, expect } from '@playwright/test'
import { API_URL, cleanupTestRepos } from './helpers'

/**
 * Repository CRUD API Tests
 */
test.describe('Repository API', () => {

  const testRepo = {
    name: 'test-repo',
    owner: 'test-owner',
    full_name: 'test-owner/test-repo',
    github_url: 'https://github.com/test-owner/test-repo',
    branch: 'develop',
  }

  let createdId: string

  test.afterAll(async ({ request }) => {
    // Cleanup
    if (createdId) {
      await request.delete(`${API_URL}/api/v1/repositories/${createdId}`)
    }
  })

  test('POST /repositories creates a new repository', async ({ request }) => {
    // Ensure clean state first
    const listRes = await request.get(`${API_URL}/api/v1/repositories`)
    const existing = await listRes.json()
    for (const r of existing.filter((r: any) => r.full_name === testRepo.full_name)) {
      await request.delete(`${API_URL}/api/v1/repositories/${r.id}`)
    }

    const res = await request.post(`${API_URL}/api/v1/repositories`, { data: testRepo })
    expect(res.status()).toBe(201)
    const body = await res.json()
    expect(body.id).toBeDefined()
    expect(body.full_name).toBe(testRepo.full_name)
    expect(body.branch).toBe(testRepo.branch)
    expect(body.is_active).toBe(true)
    createdId = body.id
  })

  test('POST /repositories returns 409 for duplicate', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories`, { data: testRepo })
    expect(res.status()).toBe(409)
  })

  test('GET /repositories/:id returns the created repo', async ({ request }) => {
    expect(createdId).toBeTruthy()
    const res = await request.get(`${API_URL}/api/v1/repositories/${createdId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.id).toBe(createdId)
    expect(body.full_name).toBe(testRepo.full_name)
    expect(body.schedule).toBeDefined()
    expect(body.schedule.cron_expression).toBeDefined()
  })

  test('PUT /repositories/:id updates the branch', async ({ request }) => {
    const res = await request.put(`${API_URL}/api/v1/repositories/${createdId}`, {
      data: { branch: 'feature/new-branch' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.branch).toBe('feature/new-branch')
  })

  test('POST /repositories/:id/schedule upserts schedule config', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories/${createdId}/schedule`, {
      data: { cron_expression: '0 12 * * *', lookback_days: 3, branch_pattern: 'develop' },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.cron_expression).toBe('0 12 * * *')
    expect(body.lookback_days).toBe(3)
  })

  test('GET /repositories/:id/commits returns array', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/repositories/${createdId}/commits`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  test('POST /repositories/:id/trigger returns 202', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories/${createdId}/trigger`)
    expect(res.status()).toBe(202)
    const body = await res.json()
    expect(body.message).toContain('triggered')
    expect(body.repository_id).toBe(createdId)
  })

  test('DELETE /repositories/:id removes the repo', async ({ request }) => {
    const res = await request.delete(`${API_URL}/api/v1/repositories/${createdId}`)
    expect(res.status()).toBe(204)
    // Verify it is gone
    const getRes = await request.get(`${API_URL}/api/v1/repositories/${createdId}`)
    expect(getRes.status()).toBe(404)
    createdId = '' // prevent afterAll double-delete
  })

  test('GET /repositories/:id returns 404 for unknown id', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/repositories/00000000-0000-0000-0000-000000000000`)
    expect(res.status()).toBe(404)
  })
})
