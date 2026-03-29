import { Page, expect } from '@playwright/test'

export const API_URL = process.env.API_URL || 'http://localhost:8000'
export const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

/** Wait for the page to finish loading (no spinner visible) */
export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  // Wait for any spinner to disappear
  const spinner = page.getByTestId('loading-spinner')
  if (await spinner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: 15_000 })
  }
}

/** Navigate to a page and wait for load */
export async function navigateTo(page: Page, path: string) {
  await page.goto(path)
  await waitForPageLoad(page)
}

/** Create a test repository via API (bypasses UI for setup) */
export async function createTestRepo(page: Page, fullName = 'test-owner/test-repo') {
  const response = await page.request.post(`${API_URL}/api/v1/repositories`, {
    data: {
      name: fullName.split('/')[1],
      owner: fullName.split('/')[0],
      full_name: fullName,
      github_url: `https://github.com/${fullName}`,
      branch: 'main',
    },
  })
  // May be 201 (created) or 409 (already exists)
  return response
}

/** Delete all test repos matching a name prefix */
export async function cleanupTestRepos(page: Page, prefix = 'test-owner') {
  const res = await page.request.get(`${API_URL}/api/v1/repositories`)
  const repos = await res.json()
  for (const repo of repos) {
    if (repo.owner === prefix) {
      await page.request.delete(`${API_URL}/api/v1/repositories/${repo.id}`)
    }
  }
}
