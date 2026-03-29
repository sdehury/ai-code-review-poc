import { test, expect } from '@playwright/test'
import { navigateTo, BASE_URL } from './helpers'

/**
 * Dashboard UI Tests
 * Verifies the React dashboard renders correctly and KPI cards are visible.
 */
test.describe('Dashboard UI', () => {

  test.beforeEach(async ({ page }) => {
    await navigateTo(page, `${BASE_URL}/dashboard`)
  })

  test('dashboard page renders with correct title', async ({ page }) => {
    await expect(page.getByTestId('dashboard-page')).toBeVisible()
    await expect(page.locator('h2')).toContainText('Dashboard')
  })

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByTestId('sidebar-nav')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Repositories' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Reviews' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Developers' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Security' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tech Debt' })).toBeVisible()
  })

  test('API status indicator is shown in header', async ({ page }) => {
    await expect(page.getByTestId('api-status')).toBeVisible()
  })

  test('KPI cards are rendered', async ({ page }) => {
    await expect(page.getByTestId('kpi-repos')).toBeVisible()
    await expect(page.getByTestId('kpi-commits')).toBeVisible()
    await expect(page.getByTestId('kpi-findings')).toBeVisible()
    await expect(page.getByTestId('kpi-critical')).toBeVisible()
    await expect(page.getByTestId('kpi-score')).toBeVisible()
    await expect(page.getByTestId('kpi-devs')).toBeVisible()
  })

  test('findings trend chart is rendered', async ({ page }) => {
    await expect(page.getByTestId('findings-trend-chart')).toBeVisible()
    // Recharts main SVG surface should be inside the chart container
    await expect(page.getByTestId('findings-trend-chart').locator('svg.recharts-surface').first()).toBeVisible()
  })

  test('severity donut chart is rendered', async ({ page }) => {
    await expect(page.getByTestId('severity-donut')).toBeVisible()
  })

  test('recent reviews table or empty message is shown', async ({ page }) => {
    const table = page.getByTestId('recent-reviews-table')
    const emptyMsg = page.getByText('No reviews yet')
    await expect(table.or(emptyMsg)).toBeVisible()
  })

  test('navigating to Repositories via sidebar works', async ({ page }) => {
    await page.getByRole('link', { name: 'Repositories' }).click()
    await expect(page).toHaveURL(/repositories/)
    await expect(page.getByTestId('repositories-page')).toBeVisible()
  })
})
