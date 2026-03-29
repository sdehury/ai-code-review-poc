import re
from typing import List, Dict

TECH_DEBT_PATTERNS = [
    {
        "rule_id": "TD001", "severity": "HIGH",
        "pattern": re.compile(r"@Deprecated|sun\.\w+\.\w+", re.IGNORECASE),
        "title": "Deprecated API Usage",
        "estimate_minutes": 120,
    },
    {
        "rule_id": "TD002", "severity": "MEDIUM",
        "pattern": re.compile(r"//\s*(TODO|FIXME|HACK|XXX|BUG)\b", re.IGNORECASE),
        "title": "Technical Debt Marker Comment",
        "estimate_minutes": 30,
    },
    {
        "rule_id": "TD003", "severity": "MEDIUM",
        "pattern": re.compile(r"catch\s*\(\s*Exception\b|\bcatch\s*\(\s*Throwable\b", re.IGNORECASE),
        "title": "Overly Broad Exception Handler",
        "estimate_minutes": 60,
    },
    {
        "rule_id": "TD004", "severity": "MEDIUM",
        "pattern": re.compile(r"catch\s*\(.*\)\s*\{\s*\}", re.IGNORECASE),
        "title": "Empty Catch Block — Exception Swallowed",
        "estimate_minutes": 60,
    },
    {
        "rule_id": "TD005", "severity": "HIGH",
        "pattern": re.compile(r"System\.out\.print|System\.err\.print", re.IGNORECASE),
        "title": "Console Print Statement (use SLF4J logger)",
        "estimate_minutes": 15,
    },
    {
        "rule_id": "TD006", "severity": "LOW",
        "pattern": re.compile(r"^\+?\s*(private|public|protected)?\s+\w+\s+\w+\s*\(\s*\)\s*\{[\s\S]{2000,}", re.IGNORECASE),
        "title": "Large Method — Consider Refactoring",
        "estimate_minutes": 180,
    },
]

class TechDebtAnalyzer:
    def analyze_diff(self, diff_patch: str, file_path: str) -> List[Dict]:
        findings = []
        lines = diff_patch.split("\n")
        for i, line in enumerate(lines):
            if not line.startswith("+"):
                continue
            code_line = line[1:]
            for rule in TECH_DEBT_PATTERNS:
                if rule["pattern"].search(code_line):
                    findings.append({
                        "rule_id": rule["rule_id"],
                        "category": "TECH_DEBT",
                        "severity": rule["severity"],
                        "title": rule["title"],
                        "file_path": file_path,
                        "line_start": i + 1,
                        "code_snippet": code_line.strip()[:200],
                        "description": f"{rule['title']} in {file_path}",
                        "recommendation": "Review and refactor to address this technical debt item",
                        "estimate_minutes": rule["estimate_minutes"],
                    })
        return findings
