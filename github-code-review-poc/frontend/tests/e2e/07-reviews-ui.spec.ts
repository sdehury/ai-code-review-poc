import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL } from './helpers'

/**
 * Reviews Page UI Tests
 */
test.describe('Reviews UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/reviews`)
  })

  test('reviews page renders', async ({ page }) => {
    await expect(page.getByTestId('reviews-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Reviews')
  })

  test('reviews table or empty state is shown', async ({ page }) => {
    const table = page.getByTestId('reviews-table')
    const emptyMsg = page.getByText('No reviews yet')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 8000 })
  })

  test('review rows have status badge', async ({ page }) => {
    const rows = page.getByTestId('review-row')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first().getByTestId('status-badge')).toBeVisible()
    }
  })
})
