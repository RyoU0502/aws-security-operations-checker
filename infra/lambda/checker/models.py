from __future__ import annotations

from typing import Literal, Protocol, TypedDict


CheckStatus = Literal["PASS", "FAIL", "ERROR"]
CheckSeverity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class RequiredCheckResult(TypedDict):
    checkId: str
    checkName: str
    status: CheckStatus
    severity: CheckSeverity
    message: str
    resourceId: str
    checkedAt: str


class CheckResult(RequiredCheckResult, total=False):
    details: dict[str, object]


class CheckSummary(TypedDict):
    total: int
    passCount: int
    failCount: int
    errorCount: int


class CheckRun(TypedDict):
    schemaVersion: int
    resultId: str
    checkedAt: str
    envName: str
    message: str
    summary: CheckSummary
    results: list[CheckResult]


class LambdaResponse(TypedDict):
    statusCode: int
    body: str


class Checker(Protocol):
    checker_id: str
    name: str
    severity: CheckSeverity

    def run(self, checked_at: str) -> list[CheckResult]:
        ...
