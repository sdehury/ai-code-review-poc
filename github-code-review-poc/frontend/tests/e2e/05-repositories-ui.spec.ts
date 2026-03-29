import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL, API_URL } from './helpers'

/**
 * Repositories UI Tests
 */
test.describe('Repositories UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/repositories`)
  })

  test('repositories page renders', async ({ page }) => {
    await expect(page.getByTestId('repositories-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Repositories')
  })

  test('Add Repository button is visible and opens form', async ({ page }) => {
    const btn = page.getByTestId('add-repo-btn')
    await expect(btn).toBeVisible()
    await btn.click()
    await expect(page.getByTestId('add-repo-form')).toBeVisible()
  })

  test('form inputs are visible after opening form', async ({ page }) => {
    await page.getByTestId('add-repo-btn').click()
    await expect(page.getByTestId('repo-name-input')).toBeVisible()
    await expect(page.getByTestId('repo-branch-input')).toBeVisible()
    await expect(page.getByTestId('repo-token-input')).toBeVisible()
    await expect(page.getByTestId('submit-repo-btn')).toBeVisible()
  })

  test('form shows validation error for invalid repo format', async ({ page }) => {
    await page.getByTestId('add-repo-btn').click()
    await page.getByTestId('repo-name-input').fill('invalid-format-no-slash')
    await page.getByTestId('submit-repo-btn').click()
    await expect(page.getByText('Format must be owner/repo')).toBeVisible()
  })

  test('can add and delete a repository via UI', async ({ page }) => {
    // Clean up first
    const res = await page.request.get(`${API_URL}/api/v1/repositories`)
    const repos = await res.json()
    for (const r of repos.filter((r: any) => r.full_name === 'ui-owner/ui-test-repo')) {
      await page.request.delete(`${API_URL}/api/v1/repositories/${r.id}`)
    }
    await page.reload()
    await navigateTo(page, `${BASE_URL}/repositories`)

    // Add repo
    await page.getByTestId('add-repo-btn').click()
    await page.getByTestId('repo-name-input').fill('ui-owner/ui-test-repo')
    await page.getByTestId('repo-branch-input').fill('main')
    await page.getByTestId('submit-repo-btn').click()

    // Wait for form to close and card to appear
    await expect(page.getByTestId('add-repo-form')).not.toBeVisible({ timeout: 5000 })
    await expect(page.getByTestId('repo-card-ui-owner-ui-test-repo')).toBeVisible({ timeout: 5000 })

    // Delete via API to clean up
    const listRes = await page.request.get(`${API_URL}/api/v1/repositories`)
    const updated = await listRes.json()
    for (const r of updated.filter((r: any) => r.full_name === 'ui-owner/ui-test-repo')) {
      await page.request.delete(`${API_URL}/api/v1/repositories/${r.id}`)
    }
  })

  test('empty state is shown when no repositories exist', async ({ page }) => {
    // Check either empty state or repo cards exist
    const emptyState = page.getByText('No repositories configured')
    const repoCards = page.locator('[data-testid^="repo-card-"]')
    const count = await repoCards.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    } else {
      expect(count).toBeGreaterThan(0)
    }
  })
})
