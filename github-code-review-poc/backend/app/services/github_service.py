import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

class GitHubService:
    def __init__(self, token: Optional[str] = None):
        from github import Github, GithubException
        self._GithubException = GithubException
        settings = get_settings()
        t = token or settings.default_github_token
        self.client = Github(t, per_page=100) if t else Github(per_page=100)

    def get_repository_info(self, repo_full_name: str) -> Dict[str, Any]:
        repo = self.client.get_repo(repo_full_name)
        return {
            "name": repo.name,
            "owner": repo.owner.login,
            "full_name": repo.full_name,
            "github_url": repo.html_url,
            "default_branch": repo.default_branch,
        }

    def get_commits_since(
        self,
        repo_full_name: str,
        branch: str,
        since: datetime,
        max_commits: int = 50
    ) -> List[Dict[str, Any]]:
        try:
            repo = self.client.get_repo(repo_full_name)
            commits = repo.get_commits(sha=branch, since=since)
            result = []
            count = 0
            for commit in commits:
                if count >= max_commits:
                    break
                try:
                    files = list(commit.files or [])
                    java_files = [f for f in files if f.filename.endswith(".java")]
                    java_diffs = []
                    for f in java_files:
                        if f.patch:
                            java_diffs.append({
                                "filename": f.filename,
                                "patch": f.patch,
                                "additions": f.additions,
                                "deletions": f.deletions,
                                "status": f.status,
                            })
                    result.append({
                        "sha": commit.sha,
                        "message": commit.commit.message or "",
                        "author_name": commit.commit.author.name if commit.commit.author else "unknown",
                        "author_email": commit.commit.author.email if commit.commit.author else "",
                        "committed_at": commit.commit.author.date if commit.commit.author else datetime.now(timezone.utc),
                        "files_changed": len(files),
                        "additions": commit.stats.additions if commit.stats else 0,
                        "deletions": commit.stats.deletions if commit.stats else 0,
                        "java_diffs": java_diffs,
                    })
                    count += 1
                except Exception as e:
                    logger.warning(f"Error processing commit {commit.sha}: {e}")
                    continue
            return result
        except Exception as e:
            logger.error(f"GitHub API error for {repo_full_name}: {e}")
            raise
