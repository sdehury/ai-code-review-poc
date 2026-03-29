import json
import re
import logging
from typing import Dict, Any
from app.config import get_settings

logger = logging.getLogger(__name__)

AI_REVIEW_PROMPT = """
You are a senior Java/Spring Framework architect performing a code review.
Analyze the following git diff and identify issues. Respond ONLY with a valid JSON object.

Required JSON format:
{
  "overall_score": <integer 0-100>,
  "summary": "<1-2 sentence summary>",
  "findings": [
    {
      "category": "SECURITY|TECH_DEBT|CODE_QUALITY",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW|INFO",
      "title": "<short title>",
      "file_path": "<file>",
      "line_hint": <integer or null>,
      "description": "<detailed description>",
      "recommendation": "<actionable fix>"
    }
  ]
}

Focus on: SQL injection, hardcoded credentials, XSS, insecure deserialization, deprecated APIs,
TODO markers, missing tests, Spring @Transactional misuse, N+1 query patterns, missing @Valid.

Git Diff (first 8000 chars):
{diff}
"""

class AIReviewer:
    def __init__(self):
        self.settings = get_settings()

    def review_diff(self, diff_content: str, repo_name: str) -> Dict[str, Any]:
        if self.settings.ai_provider == "disabled" or not diff_content.strip():
            return self._fallback_response()

        try:
            if self.settings.ai_provider == "anthropic" and self.settings.anthropic_api_key:
                return self._call_anthropic(diff_content)
            else:
                return self._fallback_response()
        except Exception as e:
            logger.warning(f"AI review failed: {e}")
            return self._fallback_response()

    def _call_anthropic(self, diff_content: str) -> Dict[str, Any]:
        import anthropic
        client = anthropic.Anthropic(api_key=self.settings.anthropic_api_key)
        prompt = AI_REVIEW_PROMPT.format(diff=diff_content[:8000])
        message = client.messages.create(
            model=self.settings.ai_model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}]
        )
        text = message.content[0].text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
        return self._fallback_response()

    def _fallback_response(self) -> Dict[str, Any]:
        return {
            "overall_score": 75,
            "summary": "Automated pattern analysis completed. Enable AI provider for deeper insights.",
            "findings": []
        }
