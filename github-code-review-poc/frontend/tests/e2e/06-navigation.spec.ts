import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL } from './helpers'

/**
 * Navigation & Routing Tests
 * Verifies all pages load and sidebar navigation works correctly.
 */
test.describe('Navigation & Routing', () => {

  const pages = [
    { path: '/dashboard',   testId: 'dashboard-page',          heading: 'Dashboard' },
    { path: '/repositories',testId: 'repositories-page',       heading: 'Repositories' },
    { path: '/reviews',     testId: 'reviews-page',            heading: 'Reviews' },
    { path: '/developers',  testId: 'developers-page',         heading: 'Developers' },
    { path: '/security',    testId: 'security-findings-page',  heading: 'Security Findings' },
    { path: '/techdebt',    testId: 'techdebt-page',           heading: 'Technical Debt' },
  ]

  for (const { path, testId, heading } of pages) {
    test(`${path} page loads and shows correct heading`, async ({ page }) => {
      await navigateTo(page, `${BASE_URL}${path}`)
      await expect(page.getByTestId(testId)).toBeVisible({ timeout: 10_000 })
      await expect(page.locator('h2').first()).toContainText(heading)
    })
  }

  test('root / redirects to /dashboard', async ({ page }) => {
    await page.goto(BASE_URL)
    await page.waitForURL(/dashboard/, { timeout: 5000 })
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
  })

  test('active nav link is highlighted when on dashboard', async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/dashboard`)
    const dashLink = page.getByRole('link', { name: 'Dashboard' })
    await expect(dashLink).toHaveClass(/bg-blue-600/)
  })

  test('active nav link changes when navigating to Repositories', async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/repositories`)
    const repoLink = page.getByRole('link', { name: 'Repositories' })
    await expect(repoLink).toHaveClass(/bg-blue-600/)
    const dashLink = page.getByRole('link', { name: 'Dashboard' })
    await expect(dashLink).not.toHaveClass(/bg-blue-600/)
  })

  test('page title contains "Java Code Review"', async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/dashboard`)
    await expect(page).toHaveTitle(/Java Code Review/)
  })

  test('sidebar brand text is visible', async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/dashboard`)
    await expect(page.getByText('Java CodeReview')).toBeVisible()
  })
})
