import logging
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Repository, Commit, Review, Finding, Developer, DeveloperCommit
from app.services.github_service import GitHubService
from app.services.security_analyzer import SecurityAnalyzer
from app.services.techdebt_analyzer import TechDebtAnalyzer
from app.services.ai_reviewer import AIReviewer

logger = logging.getLogger(__name__)

class AnalysisEngine:
    def __init__(self, db: Session):
        self.db = db
        self.security_analyzer = SecurityAnalyzer()
        self.techdebt_analyzer = TechDebtAnalyzer()
        self.ai_reviewer = AIReviewer()

    def process_repository(self, repository_id: str) -> dict:
        repo = self.db.query(Repository).filter(Repository.id == repository_id).first()
        if not repo:
            logger.error(f"Repository {repository_id} not found")
            return {"status": "error", "message": "Repository not found"}

        schedule = repo.schedule
        lookback_days = schedule.lookback_days if schedule else 7
        max_commits = schedule.max_commits_per_run if schedule else 50
        branch = (schedule.branch_pattern if schedule else None) or repo.branch

        since = datetime.now(timezone.utc) - timedelta(days=lookback_days)

        # Decrypt token if stored
        token = None
        if repo.access_token_enc:
            try:
                from app.services.crypto_service import decrypt_token
                token = decrypt_token(repo.access_token_enc)
            except Exception:
                token = repo.access_token_enc  # fallback: treat as plaintext

        try:
            gh = GitHubService(token)
            commits_data = gh.get_commits_since(repo.full_name, branch, since, max_commits)
        except Exception as e:
            logger.error(f"Failed to fetch commits for {repo.full_name}: {e}")
            if schedule:
                schedule.last_run_at = datetime.now(timezone.utc)
                schedule.last_run_status = "FAILED"
                self.db.commit()
            return {"status": "error", "message": str(e)}

        processed = 0
        for cd in commits_data:
            try:
                self._process_commit(repo, cd)
                processed += 1
            except Exception as e:
                logger.error(f"Error processing commit {cd.get('sha')}: {e}")

        if schedule:
            schedule.last_run_at = datetime.now(timezone.utc)
            schedule.last_run_status = "SUCCESS"
            self.db.commit()

        return {"status": "success", "processed": processed}

    def _process_commit(self, repo: Repository, cd: dict):
        # Upsert commit
        commit = self.db.query(Commit).filter(
            Commit.repository_id == repo.id,
            Commit.sha == cd["sha"]
        ).first()

        if commit and commit.review_status == "COMPLETED":
            return  # Already reviewed

        if not commit:
            commit = Commit(
                repository_id=repo.id,
                sha=cd["sha"],
                message=cd.get("message", "")[:500] if cd.get("message") else "",
                author_email=cd.get("author_email", ""),
                author_name=cd.get("author_name", ""),
                committed_at=cd["committed_at"],
                files_changed=cd.get("files_changed", 0),
                additions=cd.get("additions", 0),
                deletions=cd.get("deletions", 0),
                review_status="PENDING",
            )
            self.db.add(commit)
            self.db.flush()

        # Upsert developer
        author_login = (cd.get("author_email") or "").split("@")[0] or cd.get("author_name", "unknown")
        author_login = author_login.replace(" ", ".").lower()
        developer = self.db.query(Developer).filter(Developer.github_login == author_login).first()
        if not developer:
            developer = Developer(
                github_login=author_login,
                name=cd.get("author_name"),
                email=cd.get("author_email"),
                first_seen_at=cd["committed_at"],
            )
            self.db.add(developer)
            self.db.flush()

        developer.total_commits += 1
        developer.total_additions += cd.get("additions", 0)
        developer.total_deletions += cd.get("deletions", 0)
        developer.last_seen_at = cd["committed_at"]

        # Link developer to commit
        existing_dc = self.db.query(DeveloperCommit).filter(
            DeveloperCommit.developer_id == developer.id,
            DeveloperCommit.commit_id == commit.id
        ).first()
        if not existing_dc:
            dc = DeveloperCommit(developer_id=developer.id, commit_id=commit.id, repository_id=repo.id)
            self.db.add(dc)

        # Create review
        review = Review(
            commit_id=commit.id,
            repository_id=repo.id,
            status="RUNNING",
            started_at=datetime.now(timezone.utc),
        )
        self.db.add(review)
        self.db.flush()
        commit.review_status = "IN_PROGRESS"

        all_findings = []
        combined_diff = ""

        for diff_info in cd.get("java_diffs", []):
            patch = diff_info.get("patch", "")
            fname = diff_info.get("filename", "")
            combined_diff += f"\n--- {fname} ---\n{patch}"

            for sec_finding in self.security_analyzer.analyze_diff(patch, fname):
                all_findings.append({
                    "category": "SECURITY",
                    "severity": sec_finding.severity,
                    "rule_id": sec_finding.rule_id,
                    "title": sec_finding.title,
                    "file_path": sec_finding.file_path,
                    "line_start": sec_finding.line_number,
                    "code_snippet": sec_finding.code_snippet,
                    "description": sec_finding.description,
                    "recommendation": sec_finding.recommendation,
                    "cwe_id": sec_finding.cwe_id,
                })

            for td_finding in self.techdebt_analyzer.analyze_diff(patch, fname):
                all_findings.append(td_finding)

        # AI review
        ai_result = self.ai_reviewer.review_diff(combined_diff, repo.full_name)
        for af in ai_result.get("findings", []):
            all_findings.append({
                "category": af.get("category", "CODE_QUALITY"),
                "severity": af.get("severity", "MEDIUM"),
                "rule_id": "AI-001",
                "title": af.get("title", "AI Finding"),
                "file_path": af.get("file_path", ""),
                "line_start": af.get("line_hint"),
                "description": af.get("description", ""),
                "recommendation": af.get("recommendation", ""),
            })

        # Persist findings
        critical_count = 0
        high_count = 0
        for f in all_findings:
            finding = Finding(
                review_id=review.id,
                commit_id=commit.id,
                category=f.get("category", "CODE_QUALITY"),
                severity=f.get("severity", "MEDIUM"),
                rule_id=f.get("rule_id"),
                title=f.get("title", "Unknown")[:500],
                description=f.get("description", ""),
                file_path=f.get("file_path", ""),
                line_start=f.get("line_start"),
                code_snippet=f.get("code_snippet", ""),
                recommendation=f.get("recommendation", ""),
                cwe_id=f.get("cwe_id"),
            )
            self.db.add(finding)
            if f.get("severity") == "CRITICAL":
                critical_count += 1
            elif f.get("severity") == "HIGH":
                high_count += 1

        # Calculate score
        base_score = 100.0
        base_score -= critical_count * 15
        base_score -= high_count * 8
        base_score = max(0.0, min(100.0, base_score))
        ai_score = ai_result.get("overall_score", base_score)
        overall = (base_score + ai_score) / 2

        review.status = "COMPLETED"
        review.completed_at = datetime.now(timezone.utc)
        review.overall_score = round(overall, 2)
        review.summary = ai_result.get("summary", f"Found {len(all_findings)} issues.")
        review.ai_review_text = ai_result.get("summary", "")

        commit.review_status = "COMPLETED"

        # Update developer risk score
        developer.critical_findings_count += critical_count
        developer.high_findings_count += high_count
        risk = (developer.critical_findings_count * 10.0 + developer.high_findings_count * 5.0) / max(developer.total_commits, 1)
        developer.risk_score = round(min(100.0, risk), 2)

        self.db.commit()
