import re
from dataclasses import dataclass, field
from typing import List

@dataclass
class SecurityFinding:
    rule_id: str
    severity: str
    title: str
    file_path: str
    line_number: int
    code_snippet: str
    description: str
    recommendation: str
    cwe_id: str

SECURITY_PATTERNS = [
    {
        "rule_id": "SEC001", "severity": "CRITICAL",
        "pattern": re.compile(r'(executeQuery|executeUpdate)\s*\(\s*["\'].*\+|Statement\s+\w+\s*=.*\+\s*(request|param|input)', re.IGNORECASE),
        "title": "Potential SQL Injection",
        "cwe_id": "CWE-89",
        "recommendation": "Use parameterized queries, PreparedStatement with '?', or Spring Data JPA repositories"
    },
    {
        "rule_id": "SEC002", "severity": "CRITICAL",
        "pattern": re.compile(r'(password|passwd|secret|api_key|apikey|token)\s*=\s*["\'][^"\']{4,}["\']', re.IGNORECASE),
        "title": "Hardcoded Credential Detected",
        "cwe_id": "CWE-798",
        "recommendation": "Use environment variables, Spring @Value with ${}, or a secrets manager"
    },
    {
        "rule_id": "SEC003", "severity": "HIGH",
        "pattern": re.compile(r'(response\.getWriter|PrintWriter).*\.(print|write)\s*\(', re.IGNORECASE),
        "title": "Potential XSS — Unescaped Output to HTTP Response",
        "cwe_id": "CWE-79",
        "recommendation": "Use Spring MVC @ResponseBody with Jackson, or JSTL <c:out> for escaping"
    },
    {
        "rule_id": "SEC004", "severity": "HIGH",
        "pattern": re.compile(r'ObjectInputStream|new\s+ObjectInputStream|\.readObject\s*\(\s*\)', re.IGNORECASE),
        "title": "Insecure Java Deserialization",
        "cwe_id": "CWE-502",
        "recommendation": "Replace Java serialization with JSON (Jackson) or Protobuf; validate class whitelist if serialization is required"
    },
    {
        "rule_id": "SEC005", "severity": "HIGH",
        "pattern": re.compile(r'(log\.|logger\.|LOG\.)\w+\s*\(.*\b(password|token|secret|credential|ssn|credit_card)\b', re.IGNORECASE),
        "title": "Sensitive Data Exposure in Log",
        "cwe_id": "CWE-532",
        "recommendation": "Redact sensitive fields before logging; use a structured logging masking filter"
    },
    {
        "rule_id": "SEC006", "severity": "MEDIUM",
        "pattern": re.compile(r'getInstance\s*\(\s*["\']MD5["\']|getInstance\s*\(\s*["\']SHA-1["\']|new\s+DESKeySpec|RC4', re.IGNORECASE),
        "title": "Weak Cryptographic Algorithm",
        "cwe_id": "CWE-327",
        "recommendation": "Use SHA-256+, AES-256-GCM, or BCrypt/Argon2 for password hashing"
    },
    {
        "rule_id": "SEC007", "severity": "MEDIUM",
        "pattern": re.compile(r'@RequestMapping.*\n.*(?!@Valid)\s+@RequestBody|getParameter\s*\(', re.IGNORECASE),
        "title": "Missing Input Validation",
        "cwe_id": "CWE-20",
        "recommendation": "Add @Valid annotation on @RequestBody parameters; use Bean Validation (JSR-380)"
    },
    {
        "rule_id": "SEC008", "severity": "HIGH",
        "pattern": re.compile(r'new\s+File\s*\(\s*\w*(request|param|input|path)\w*', re.IGNORECASE),
        "title": "Path Traversal Vulnerability",
        "cwe_id": "CWE-22",
        "recommendation": "Canonicalize and validate file paths; restrict to an allowlisted base directory"
    },
]

class SecurityAnalyzer:
    def analyze_diff(self, diff_patch: str, file_path: str) -> List[SecurityFinding]:
        findings = []
        lines = diff_patch.split("\n")
        for i, line in enumerate(lines):
            if not line.startswith("+"):
                continue
            code_line = line[1:]
            for rule in SECURITY_PATTERNS:
                if rule["pattern"].search(code_line):
                    findings.append(SecurityFinding(
                        rule_id=rule["rule_id"],
                        severity=rule["severity"],
                        title=rule["title"],
                        file_path=file_path,
                        line_number=i + 1,
                        code_snippet=code_line.strip()[:200],
                        description=f"{rule['title']} detected in {file_path}",
                        recommendation=rule["recommendation"],
                        cwe_id=rule["cwe_id"],
                    ))
        return findings
