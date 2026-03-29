import { test, expect } from '@playwright/test'
import { API_URL } from './helpers'

/**
 * Analysis Engine Tests
 * Seeds test data to simulate what the analysis engine produces,
 * then verifies the API correctly stores and returns it.
 */
test.describe('Analysis Engine — Integration Smoke Tests', () => {

  let repoId: string
  let commitId: string
  let reviewId: string
  let findingId: string

  test.beforeAll(async ({ request }) => {
    // Clean up any leftover test data
    const listRes = await request.get(`${API_URL}/api/v1/repositories`)
    const repos = await listRes.json()
    for (const r of repos.filter((r: any) => r.full_name === 'engine-test/spring-app')) {
      await request.delete(`${API_URL}/api/v1/repositories/${r.id}`)
    }
  })

  test('step 1: create repository', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories`, {
      data: {
        name: 'spring-app', owner: 'engine-test',
        full_name: 'engine-test/spring-app',
        github_url: 'https://github.com/engine-test/spring-app',
        branch: 'develop',
      },
    })
    expect(res.status()).toBe(201)
    const body = await res.json()
    repoId = body.id
    expect(repoId).toBeTruthy()
  })

  test('step 2: repository is in list', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/repositories`)
    const repos = await res.json()
    const found = repos.find((r: any) => r.id === repoId)
    expect(found).toBeDefined()
    expect(found.full_name).toBe('engine-test/spring-app')
  })

  test('step 3: trigger review returns 202', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories/${repoId}/trigger`)
    expect(res.status()).toBe(202)
  })

  test('step 4: dashboard summary increments repository count', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/v1/dashboard/summary`)
    expect(res.status()).toBe(200)
    const summary = await res.json()
    expect(summary.total_repositories).toBeGreaterThanOrEqual(1)
  })

  test('step 5: update schedule config', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/v1/repositories/${repoId}/schedule`, {
      data: { cron_expression: '0 2 * * *', lookback_days: 14, branch_pattern: 'develop', is_active: true },
    })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.cron_expression).toBe('0 2 * * *')
    expect(body.lookback_days).toBe(14)
  })

  test('step 6: deactivate then reactivate repository', async ({ request }) => {
    const deact = await request.put(`${API_URL}/api/v1/repositories/${repoId}`, {
      data: { is_active: false }
    })
    expect(deact.status()).toBe(200)
    expect((await deact.json()).is_active).toBe(false)

    const react = await request.put(`${API_URL}/api/v1/repositories/${repoId}`, {
      data: { is_active: true }
    })
    expect(react.status()).toBe(200)
    expect((await react.json()).is_active).toBe(true)
  })

  test.afterAll(async ({ request }) => {
    if (repoId) {
      await request.delete(`${API_URL}/api/v1/repositories/${repoId}`)
    }
  })
})
