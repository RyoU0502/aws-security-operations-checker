from __future__ import annotations

import importlib.util
import json
import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import patch


CHECKER_DIR = Path(__file__).resolve().parents[2] / "lambda" / "checker"
INDEX_PATH = CHECKER_DIR / "index.py"
RESULTS_TABLE_NAME = "test-results-table"
CHECK_TARGET_ACCOUNT_ID = "000000000000"


class SpyChecker:
    checker_id = "test-checker"
    name = "Test Checker"
    severity = "LOW"

    def __init__(self) -> None:
        self.run_count = 0

    def run(self, checked_at: str) -> list[dict[str, object]]:
        self.run_count += 1
        return [
            {
                "checkId": self.checker_id,
                "checkName": self.name,
                "status": "PASS",
                "severity": self.severity,
                "message": "test result",
                "resourceId": "test-resource",
                "checkedAt": checked_at,
            }
        ]


class FakeTable:
    def __init__(self) -> None:
        self.items: list[dict[str, object]] = []

    def put_item(self, *, Item: dict[str, object]) -> object:
        self.items.append(Item)
        return {}


class FakeDynamoDbResource:
    def __init__(self, table: FakeTable) -> None:
        self.table = table
        self.table_names: list[str] = []

    def Table(self, table_name: str) -> FakeTable:
        self.table_names.append(table_name)
        return self.table


class IndexTest(unittest.TestCase):
    def setUp(self) -> None:
        self.checker = SpyChecker()
        self.table = FakeTable()
        self.dynamodb = FakeDynamoDbResource(self.table)
        self.resource_calls: list[str] = []
        self.client_calls: list[str] = []
        self.registry_calls: list[dict[str, object]] = []

        self.boto3 = types.ModuleType("boto3")
        self.boto3.resource = self.fake_resource
        self.boto3.client = self.fake_client

        self.registry = types.ModuleType("registry")
        self.registry.create_registry = self.fake_create_registry

    def fake_resource(self, service_name: str) -> FakeDynamoDbResource:
        self.resource_calls.append(service_name)
        return self.dynamodb

    def fake_client(self, service_name: str) -> object:
        self.client_calls.append(service_name)
        return object()

    def fake_create_registry(self, **kwargs: object) -> list[SpyChecker]:
        self.registry_calls.append(kwargs)
        return [self.checker]

    def load_index(self, environment: dict[str, str]) -> types.ModuleType:
        spec = importlib.util.spec_from_file_location(
            "index_under_test",
            INDEX_PATH,
        )
        if spec is None or spec.loader is None:
            raise RuntimeError("Unable to load Lambda index module for test.")

        module = importlib.util.module_from_spec(spec)
        with patch.dict(os.environ, environment, clear=True):
            with patch.dict(
                sys.modules,
                {"boto3": self.boto3, "registry": self.registry},
            ):
                spec.loader.exec_module(module)

        return module

    def valid_environment(self, env_name: str) -> dict[str, str]:
        return {
            "RESULTS_TABLE_NAME": RESULTS_TABLE_NAME,
            "CHECK_TARGET_ACCOUNT_ID": CHECK_TARGET_ACCOUNT_ID,
            "ENV_NAME": env_name,
        }

    def test_dev_executes_and_saves_compatible_response(self) -> None:
        self.assert_valid_env_name("dev")

    def test_prod_executes_and_saves_compatible_response(self) -> None:
        self.assert_valid_env_name("prod")

    def assert_valid_env_name(self, env_name: str) -> None:
        index = self.load_index(self.valid_environment(env_name))

        response = index.handler({}, None)
        response_body = json.loads(response["body"])

        self.assertEqual(200, response["statusCode"])
        self.assertEqual(1, self.checker.run_count)
        self.assertEqual(["dynamodb"], self.resource_calls)
        self.assertEqual(["s3control"], self.client_calls)
        self.assertEqual([RESULTS_TABLE_NAME], self.dynamodb.table_names)
        self.assertEqual(1, len(self.table.items))
        self.assertEqual(self.table.items[0], response_body)
        self.assertEqual(2, response_body["schemaVersion"])
        self.assertEqual(env_name, response_body["envName"])
        self.assertEqual(
            {
                "schemaVersion",
                "resultId",
                "checkedAt",
                "envName",
                "message",
                "summary",
                "results",
            },
            set(response_body),
        )
        self.assertEqual(
            {
                "checkId",
                "checkName",
                "status",
                "severity",
                "message",
                "resourceId",
                "checkedAt",
            },
            set(response_body["results"][0]),
        )

    def test_invalid_env_name_fails_before_aws_or_checker_activity(self) -> None:
        invalid_env_names = ("", "   \t", "unknown", "staging", "DEV")

        for env_name in invalid_env_names:
            with self.subTest(env_name=env_name):
                self.setUp()

                with patch("logging.Logger._log") as log:
                    with self.assertRaises(ValueError) as raised:
                        self.load_index(self.valid_environment(env_name))

                self.assertEqual(
                    "Invalid ENV_NAME configuration.",
                    str(raised.exception),
                )
                self.assertNotIn(RESULTS_TABLE_NAME, str(raised.exception))
                self.assertNotIn(
                    CHECK_TARGET_ACCOUNT_ID,
                    str(raised.exception),
                )
                if env_name:
                    self.assertNotIn(env_name, str(raised.exception))
                log.assert_not_called()
                self.assert_no_activity()

    def test_missing_env_name_fails_before_aws_or_checker_activity(self) -> None:
        self.assert_missing_configuration("ENV_NAME")

    def test_missing_table_name_fails_before_aws_or_checker_activity(
        self,
    ) -> None:
        self.assert_missing_configuration("RESULTS_TABLE_NAME")

    def test_missing_account_id_fails_before_aws_or_checker_activity(
        self,
    ) -> None:
        self.assert_missing_configuration("CHECK_TARGET_ACCOUNT_ID")

    def assert_missing_configuration(self, variable_name: str) -> None:
        environment = self.valid_environment("dev")
        del environment[variable_name]

        with patch("logging.Logger._log") as log:
            with self.assertRaises(KeyError) as raised:
                self.load_index(environment)

        self.assertEqual(repr(variable_name), str(raised.exception))
        self.assertNotIn(RESULTS_TABLE_NAME, str(raised.exception))
        self.assertNotIn(CHECK_TARGET_ACCOUNT_ID, str(raised.exception))
        log.assert_not_called()
        self.assert_no_activity()

    def assert_no_activity(self) -> None:
        self.assertEqual([], self.resource_calls)
        self.assertEqual([], self.client_calls)
        self.assertEqual([], self.registry_calls)
        self.assertEqual(0, self.checker.run_count)
        self.assertEqual([], self.table.items)


if __name__ == "__main__":
    unittest.main()
