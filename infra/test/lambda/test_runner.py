from __future__ import annotations

import unittest

from runner import run_checkers


CHECKED_AT = "2026-01-01T00:00:00+00:00"


def check_result(
    *,
    check_id: str,
    status: str = "PASS",
    checked_at: str = "different-time",
) -> dict[str, object]:
    return {
        "checkId": check_id,
        "checkName": check_id,
        "status": status,
        "severity": "LOW",
        "message": "test result",
        "resourceId": "test-resource",
        "checkedAt": checked_at,
    }


class StubChecker:
    severity = "LOW"

    def __init__(
        self,
        checker_id: str,
        result: object,
        execution_order: list[str] | None = None,
    ) -> None:
        self.checker_id = checker_id
        self.name = checker_id
        self.result = result
        self.execution_order = execution_order

    def run(self, checked_at: str) -> object:
        if self.execution_order is not None:
            self.execution_order.append(self.checker_id)

        if isinstance(self.result, Exception):
            raise self.result

        return self.result


class RunnerTest(unittest.TestCase):
    def test_runs_checkers_in_registration_order_and_flattens_results(
        self,
    ) -> None:
        execution_order: list[str] = []
        first = StubChecker(
            "first",
            [
                check_result(check_id="first-a"),
                check_result(check_id="first-b"),
            ],
            execution_order,
        )
        second = StubChecker(
            "second",
            [check_result(check_id="second-a")],
            execution_order,
        )

        results, _ = run_checkers([first, second], CHECKED_AT)

        self.assertEqual(["first", "second"], execution_order)
        self.assertEqual(
            ["first-a", "first-b", "second-a"],
            [result["checkId"] for result in results],
        )

    def test_creates_summary_for_all_statuses(self) -> None:
        checker = StubChecker(
            "summary",
            [
                check_result(check_id="pass", status="PASS"),
                check_result(check_id="fail", status="FAIL"),
                check_result(check_id="error", status="ERROR"),
            ],
        )

        _, summary = run_checkers([checker], CHECKED_AT)

        self.assertEqual(
            {
                "total": 3,
                "passCount": 1,
                "failCount": 1,
                "errorCount": 1,
            },
            summary,
        )
        self.assertEqual(
            summary["total"],
            summary["passCount"]
            + summary["failCount"]
            + summary["errorCount"],
        )

    def test_checker_exception_becomes_error_and_next_checker_runs(self) -> None:
        execution_order: list[str] = []
        failing = StubChecker(
            "failing",
            RuntimeError("sensitive exception text"),
            execution_order,
        )
        next_checker = StubChecker(
            "next",
            [check_result(check_id="next")],
            execution_order,
        )

        with self.assertLogs("runner", level="ERROR") as logs:
            results, summary = run_checkers(
                [failing, next_checker],
                CHECKED_AT,
            )

        self.assertEqual(["failing", "next"], execution_order)
        self.assertEqual(["ERROR", "PASS"], [r["status"] for r in results])
        self.assertEqual(1, summary["errorCount"])
        self.assertIn("RuntimeError", logs.output[0])
        self.assertNotIn("sensitive exception text", logs.output[0])

    def test_empty_list_becomes_error(self) -> None:
        self.assert_invalid_result_becomes_error([])

    def test_none_becomes_error(self) -> None:
        self.assert_invalid_result_becomes_error(None)

    def test_non_list_becomes_error(self) -> None:
        self.assert_invalid_result_becomes_error(
            check_result(check_id="not-a-list"),
        )

    def test_missing_required_key_becomes_error(self) -> None:
        invalid_result = check_result(check_id="missing-status")
        del invalid_result["status"]

        self.assert_invalid_result_becomes_error([invalid_result])

    def test_unknown_status_becomes_error(self) -> None:
        self.assert_invalid_result_becomes_error(
            [check_result(check_id="unknown-status", status="UNKNOWN")],
        )

    def test_invalid_severity_becomes_error(self) -> None:
        invalid_result = check_result(check_id="invalid-severity")
        invalid_result["severity"] = "UNKNOWN"

        self.assert_invalid_result_becomes_error([invalid_result])

    def test_non_dict_details_becomes_error(self) -> None:
        invalid_result = check_result(check_id="invalid-details")
        invalid_result["details"] = ["not", "a", "dict"]

        self.assert_invalid_result_becomes_error([invalid_result])

    def test_next_checker_runs_after_invalid_result(self) -> None:
        execution_order: list[str] = []
        invalid_result = check_result(
            check_id="invalid",
            status="UNKNOWN",
        )
        invalid_checker = StubChecker(
            "invalid",
            [invalid_result],
            execution_order,
        )
        next_checker = StubChecker(
            "next",
            [check_result(check_id="next")],
            execution_order,
        )

        with self.assertLogs("runner", level="ERROR"):
            results, summary = run_checkers(
                [invalid_checker, next_checker],
                CHECKED_AT,
            )

        self.assertEqual(["invalid", "next"], execution_order)
        self.assertEqual(["ERROR", "PASS"], [r["status"] for r in results])
        self.assertEqual(2, summary["total"])
        self.assertEqual(1, summary["passCount"])
        self.assertEqual(1, summary["errorCount"])

    def test_checker_specific_details_are_preserved(self) -> None:
        custom_result = check_result(check_id="custom-details")
        custom_result["details"] = {
            "featureEnabled": True,
            "mode": "audit",
        }
        checker = StubChecker("custom-details", [custom_result])

        results, _ = run_checkers([checker], CHECKED_AT)

        self.assertEqual(custom_result["details"], results[0]["details"])

    def assert_invalid_result_becomes_error(self, value: object) -> None:
        checker = StubChecker("invalid", value)

        with self.assertLogs("runner", level="ERROR"):
            results, summary = run_checkers([checker], CHECKED_AT)

        self.assertEqual(1, len(results))
        self.assertEqual("ERROR", results[0]["status"])
        self.assertEqual(1, summary["errorCount"])

    def test_fail_is_returned_without_processing_failure(self) -> None:
        checker = StubChecker(
            "fail",
            [check_result(check_id="fail", status="FAIL")],
        )

        results, summary = run_checkers([checker], CHECKED_AT)

        self.assertEqual("FAIL", results[0]["status"])
        self.assertEqual(1, summary["failCount"])

    def test_empty_registry_raises_configuration_error(self) -> None:
        with self.assertRaises(ValueError):
            run_checkers([], CHECKED_AT)

    def test_checked_at_is_normalized_for_every_result(self) -> None:
        checker = StubChecker(
            "times",
            [
                check_result(check_id="one", checked_at="first-time"),
                check_result(check_id="two", checked_at="second-time"),
            ],
        )

        results, _ = run_checkers([checker], CHECKED_AT)

        self.assertEqual(
            [CHECKED_AT, CHECKED_AT],
            [result["checkedAt"] for result in results],
        )


if __name__ == "__main__":
    unittest.main()
