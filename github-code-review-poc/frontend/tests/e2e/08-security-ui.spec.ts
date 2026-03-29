import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL } from './helpers'

/**
 * Security Findings UI Tests
 */
test.describe('Security Findings UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/security`)
  })

  test('security findings page renders', async ({ page }) => {
    await expect(page.getByTestId('security-findings-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Security Findings')
  })

  test('severity summary cards are shown', async ({ page }) => {
    await expect(page.getByTestId('severity-badge-critical').first()).toBeVisible()
    await expect(page.getByTestId('severity-badge-high').first()).toBeVisible()
    await expect(page.getByTestId('severity-badge-medium').first()).toBeVisible()
    await expect(page.getByTestId('severity-badge-low').first()).toBeVisible()
  })

  test('findings table or empty state is shown', async ({ page }) => {
    const table = page.getByTestId('security-findings-table')
    const emptyMsg = page.getByText('No active security findings')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 8000 })
  })
})

/**
 * Tech Debt UI Tests
 */
test.describe('Tech Debt UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/techdebt`)
  })

  test('tech debt page renders', async ({ page }) => {
    await expect(page.getByTestId('techdebt-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Technical Debt')
  })

  test('debt table or empty state is shown', async ({ page }) => {
    const table = page.getByTestId('techdebt-table')
    const emptyMsg = page.getByText('No active tech debt')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 8000 })
  })
})

/**
 * Developers UI Tests
 */
test.describe('Developers UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/developers`)
  })

  test('developers page renders', async ({ page }) => {
    await expect(page.getByTestId('developers-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Developers')
  })

  test('developers table or empty state is shown', async ({ page }) => {
    const table = page.getByTestId('developers-table')
    const emptyMsg = page.getByText('No developers tracked yet')
    await expect(table.or(emptyMsg)).toBeVisible({ timeout: 8000 })
  })

  test('developer rows have risk badges when data exists', async ({ page }) => {
    const rows = page.getByTestId('developer-row')
    const count = await rows.count()
    if (count > 0) {
      await expect(rows.first().getByTestId('risk-badge')).toBeVisible()
    }
  })
})
