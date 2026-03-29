import axios from 'axios'
import type { Repository, Commit, Review, Finding, Developer, KPISummary, TrendPoint, ScheduleConfig } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Repositories ──────────────────────────────────────────────
export const getRepositories = () =>
  api.get<Repository[]>('/api/v1/repositories').then(r => r.data)

export const getRepository = (id: string) =>
  api.get<Repository>(`/api/v1/repositories/${id}`).then(r => r.data)

export const createRepository = (payload: {
  name: string; owner: string; full_name: string
  github_url: string; branch: string; access_token?: string
}) => api.post<Repository>('/api/v1/repositories', payload).then(r => r.data)

export const updateRepository = (id: string, payload: Partial<Repository & { access_token?: string }>) =>
  api.put<Repository>(`/api/v1/repositories/${id}`, payload).then(r => r.data)

export const deleteRepository = (id: string) =>
  api.delete(`/api/v1/repositories/${id}`)

export const getRepositoryCommits = (id: string, limit = 50) =>
  api.get<Commit[]>(`/api/v1/repositories/${id}/commits?limit=${limit}`).then(r => r.data)

export const getSchedule = (repoId: string) =>
  api.get<ScheduleConfig>(`/api/v1/repositories/${repoId}/schedule`).then(r => r.data)

export const upsertSchedule = (repoId: string, payload: Partial<ScheduleConfig>) =>
  api.post<ScheduleConfig>(`/api/v1/repositories/${repoId}/schedule`, payload).then(r => r.data)

export const triggerReview = (repoId: string) =>
  api.post(`/api/v1/repositories/${repoId}/trigger`).then(r => r.data)

// ── Reviews ───────────────────────────────────────────────────
export const getReviews = (params?: { repository_id?: string; status?: string; limit?: number; offset?: number }) =>
  api.get<Review[]>('/api/v1/reviews', { params }).then(r => r.data)

export const getReview = (id: string) =>
  api.get<Review>(`/api/v1/reviews/${id}`).then(r => r.data)

export const getReviewFindings = (reviewId: string, params?: { category?: string; severity?: string }) =>
  api.get<Finding[]>(`/api/v1/reviews/${reviewId}/findings`, { params }).then(r => r.data)

// ── Findings ──────────────────────────────────────────────────
export const getFindings = (params?: { category?: string; severity?: string; repository_id?: string; limit?: number }) =>
  api.get<Finding[]>('/api/v1/findings', { params }).then(r => r.data)

export const markFalsePositive = (id: string) =>
  api.patch<Finding>(`/api/v1/findings/${id}/false-positive`).then(r => r.data)

export const resolveFinding = (id: string) =>
  api.patch<Finding>(`/api/v1/findings/${id}/resolve`).then(r => r.data)

// ── Developers ────────────────────────────────────────────────
export const getDevelopers = (limit = 50) =>
  api.get<Developer[]>(`/api/v1/developers?limit=${limit}`).then(r => r.data)

export const getDeveloper = (login: string) =>
  api.get<Developer>(`/api/v1/developers/${login}`).then(r => r.data)

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardSummary = () =>
  api.get<KPISummary>('/api/v1/dashboard/summary').then(r => r.data)

export const getDashboardTrends = (days = 30) =>
  api.get<{ trends: TrendPoint[] }>(`/api/v1/dashboard/trends?days=${days}`).then(r => r.data)

export const getHealth = () =>
  api.get('/health').then(r => r.data)

export const getSchedulerStatus = () =>
  api.get('/api/v1/scheduler/status').then(r => r.data)
