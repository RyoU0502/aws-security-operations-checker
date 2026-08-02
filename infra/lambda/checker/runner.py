from __future__ import annotations

import logging
from collections.abc import Sequence
from typing import cast

from models import Checker, CheckResult, CheckStatus, CheckSummary


logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

REQUIRED_RESULT_KEYS = (
    "checkId",
    "checkName",
    "status",
    "severity",
    "message",
    "resourceId",
    "checkedAt",
)
VALID_STATUSES = ("PASS", "FAIL", "ERROR")
VALID_SEVERITIES = ("LOW", "MEDIUM", "HIGH", "CRITICAL")


class CheckerContractError(Exception):
    """Raised when a checker violates the shared result contract."""


def _validate_result(result: object) -> dict[str, object]:
    if not isinstance(result, dict):
        raise CheckerContractError

    if any(key not in result for key in REQUIRED_RESULT_KEYS):
        raise CheckerContractError

    if not isinstance(result["checkId"], str) or not result["checkId"]:
        raise CheckerContractError

    if not isinstance(result["checkName"], str) or not result["checkName"]:
        raise CheckerContractError

    if (
        not isinstance(result["status"], str)
        or result["status"] not in VALID_STATUSES
    ):
        raise CheckerContractError

    if (
        not isinstance(result["severity"], str)
        or result["severity"] not in VALID_SEVERITIES
    ):
        raise CheckerContractError

    for string_key in ("message", "resourceId", "checkedAt"):
        if not isinstance(result[string_key], str):
            raise CheckerContractError

    if "details" in result and not isinstance(result["details"], dict):
        raise CheckerContractError

    return result


def _create_checker_error_result(
    checker: Checker,
    checked_at: str,
) -> CheckResult:
    return {
        "checkId": checker.checker_id,
        "checkName": checker.name,
        "status": "ERROR",
        "severity": checker.severity,
        "message": "Checker execution did not produce a valid result.",
        "resourceId": "unknown",
        "checkedAt": checked_at,
    }


def _normalize_results(
    checker_results: object,
    checked_at: str,
) -> list[CheckResult]:
    if not isinstance(checker_results, list) or not checker_results:
        raise CheckerContractError

    normalized_results: list[CheckResult] = []

    for result in checker_results:
        normalized_result = _validate_result(result).copy()
        normalized_result["checkedAt"] = checked_at
        normalized_results.append(cast(CheckResult, normalized_result))

    return normalized_results


def _create_summary(results: list[CheckResult]) -> CheckSummary:
    statuses: list[CheckStatus] = [result["status"] for result in results]

    return {
        "total": len(results),
        "passCount": statuses.count("PASS"),
        "failCount": statuses.count("FAIL"),
        "errorCount": statuses.count("ERROR"),
    }


def run_checkers(
    checkers: Sequence[Checker],
    checked_at: str,
) -> tuple[list[CheckResult], CheckSummary]:
    if not checkers:
        raise ValueError("Checker registry must not be empty.")

    results: list[CheckResult] = []

    for checker in checkers:
        try:
            checker_results = checker.run(checked_at)
            normalized_results = _normalize_results(
                checker_results,
                checked_at,
            )
        except Exception as error:
            logger.error(
                "checker_id=%s status=ERROR exception_type=%s",
                checker.checker_id,
                type(error).__name__,
            )
            normalized_results = [
                _create_checker_error_result(checker, checked_at)
            ]

        for result in normalized_results:
            logger.info(
                "checker_id=%s status=%s",
                checker.checker_id,
                result["status"],
            )

        results.extend(normalized_results)

    return results, _create_summary(results)
