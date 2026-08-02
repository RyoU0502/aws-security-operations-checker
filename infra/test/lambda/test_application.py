from __future__ import annotations

import json
import unittest

from application import execute_check_run


RESULT_ID = "00000000-0000-0000-0000-000000000000"
CHECKED_AT = "2026-01-01T00:00:00+00:00"


def check_result(status: str = "PASS") -> dict[str, object]:
    return {
        "checkId": "test-checker",
        "checkName": "Test Checker",
        "status": status,
        "severity": "LOW",
        "message": "test result",
        "resourceId": "test-resource",
        "checkedAt": CHECKED_AT,
    }


class StubChecker:
    checker_id = "test-checker"
    name = "Test Checker"
    severity = "LOW"

    def __init__(self, status: str = "PASS") -> None:
        self.status = status

    def run(self, checked_at: str) -> list[dict[str, object]]:
        return [check_result(self.status)]


class FakeTable:
    def __init__(self, error: Exception | None = None) -> None:
        self.error = error
        self.items: list[dict[str, object]] = []

    def put_item(self, *, Item: dict[str, object]) -> object:
        if self.error is not None:
            raise self.error

        self.items.append(Item)
        return {}


class ApplicationTest(unittest.TestCase):
    def execute(self, table: FakeTable, status: str = "PASS"):
        return execute_check_run(
            checkers=[StubChecker(status)],
            table=table,
            env_name="dev",
            result_id_factory=lambda: RESULT_ID,
            checked_at_factory=lambda: CHECKED_AT,
        )

    def test_saves_one_schema_version_two_item_matching_response(self) -> None:
        table = FakeTable()

        response = self.execute(table)
        response_body = json.loads(response["body"])

        self.assertEqual(200, response["statusCode"])
        self.assertEqual(1, len(table.items))
        self.assertEqual(2, table.items[0]["schemaVersion"])
        self.assertEqual(RESULT_ID, table.items[0]["resultId"])
        self.assertEqual(RESULT_ID, response_body["resultId"])
        self.assertEqual(table.items[0], response_body)

    def test_fail_result_still_returns_200_after_save(self) -> None:
        table = FakeTable()

        response = self.execute(table, status="FAIL")

        self.assertEqual(200, response["statusCode"])
        self.assertEqual(1, len(table.items))

    def test_put_item_failure_is_propagated(self) -> None:
        table = FakeTable(RuntimeError("put failed"))

        with self.assertRaises(RuntimeError):
            self.execute(table)

        self.assertEqual([], table.items)

    def test_empty_registry_does_not_save(self) -> None:
        table = FakeTable()

        with self.assertRaises(ValueError):
            execute_check_run(
                checkers=[],
                table=table,
                env_name="dev",
                result_id_factory=lambda: RESULT_ID,
                checked_at_factory=lambda: CHECKED_AT,
            )

        self.assertEqual([], table.items)


if __name__ == "__main__":
    unittest.main()
