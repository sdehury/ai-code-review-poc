export interface Repository {
  id: string
  name: string
  owner: string
  full_name: string
  github_url: string
  branch: string
  is_active: boolean
  created_at: string
  updated_at: string
  schedule?: ScheduleConfig
}

export interface ScheduleConfig {
  id: string
  cron_expression: string
  branch_pattern: string
  lookback_days: number
  max_commits_per_run: number
  is_active: boolean
  last_run_at?: string
  next_run_at?: string
  last_run_status?: string
}

export interface Commit {
  id: string
  repository_id: string
  sha: string
  message?: string
  author_email?: string
  author_name?: string
  committed_at: string
  files_changed: number
  additions: number
  deletions: number
  review_status: string
  created_at: string
}

export interface Review {
  id: string
  commit_id: string
  repository_id: string
  status: string
  started_at?: string
  completed_at?: string
  duration_ms?: number
  overall_score?: number
  security_score?: number
  quality_score?: number
  techdebt_score?: number
  summary?: string
  ai_review_text?: string
  error_message?: string
  created_at: string
}

export interface Finding {
  id: string
  review_id: string
  commit_id: string
  category: string
  severity: string
  rule_id?: string
  title: string
  description?: string
  file_path?: string
  line_start?: number
  line_end?: number
  code_snippet?: string
  recommendation?: string
  cwe_id?: string
  owasp_category?: string
  is_false_positive: boolean
  resolved_at?: string
  created_at: string
}

export interface Developer {
  id: string
  github_login: string
  name?: string
  email?: string
  avatar_url?: string
  total_commits: number
  total_additions: number
  total_deletions: number
  critical_findings_count: number
  high_findings_count: number
  risk_score: number
  first_seen_at?: string
  last_seen_at?: string
  created_at: string
}

export interface KPISummary {
  total_repositories: number
  total_commits_reviewed: number
  total_findings: number
  critical_findings: number
  high_findings: number
  medium_findings: number
  low_findings: number
  average_score: number
  total_developers: number
  reviews_today: number
}

export interface TrendPoint {
  date: string
  critical: number
  high: number
  medium: number
  low: number
  total: number
}

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
export type Category = 'SECURITY' | 'TECH_DEBT' | 'CODE_QUALITY' | 'DEPENDENCY' | 'STYLE'
