from __future__ import annotations

import json
import unittest

from checkers.s3_account_public_access_block import (
    S3AccountPublicAccessBlockChecker,
)


DUMMY_ACCOUNT_ID = "000000000000"
CHECKED_AT = "2026-01-01T00:00:00+00:00"


def valid_configuration(**overrides: object) -> dict[str, object]:
    configuration: dict[str, object] = {
        "BlockPublicAcls": True,
        "IgnorePublicAcls": True,
        "BlockPublicPolicy": True,
        "RestrictPublicBuckets": True,
    }
    configuration.update(overrides)
    return {"PublicAccessBlockConfiguration": configuration}


class FakeAwsApiError(Exception):
    def __init__(self, code: str) -> None:
        super().__init__("sensitive exception text")
        self.response = {
            "Error": {
                "Code": code,
                "Message": "sensitive API message",
            },
            "ResponseMetadata": {
                "RequestId": "sensitive-request-id",
            },
        }


class FakeS3ControlClient:
    def __init__(
        self,
        *,
        response: object | None = None,
        error: Exception | None = None,
    ) -> None:
        self.response = response
        self.error = error
        self.account_ids: list[str] = []

    def get_public_access_block(self, *, AccountId: str) -> object:
        self.account_ids.append(AccountId)

        if self.error is not None:
            raise self.error

        return self.response


class S3AccountPublicAccessBlockCheckerTest(unittest.TestCase):
    def run_checker(
        self,
        *,
        response: object | None = None,
        error: Exception | None = None,
    ) -> tuple[dict[str, object], FakeS3ControlClient]:
        client = FakeS3ControlClient(response=response, error=error)
        checker = S3AccountPublicAccessBlockChecker(
            s3_control_client=client,
            account_id=DUMMY_ACCOUNT_ID,
        )

        results = checker.run(CHECKED_AT)

        self.assertEqual(1, len(results))
        return results[0], client

    def test_all_settings_true_returns_pass_with_details(self) -> None:
        response = valid_configuration()

        result, client = self.run_checker(response=response)

        self.assertEqual("PASS", result["status"])
        self.assertEqual(
            response["PublicAccessBlockConfiguration"],
            result["details"],
        )
        self.assertEqual([DUMMY_ACCOUNT_ID], client.account_ids)
        self.assertNotIn(DUMMY_ACCOUNT_ID, json.dumps(result))

    def test_one_false_setting_returns_fail(self) -> None:
        result, _ = self.run_checker(
            response=valid_configuration(BlockPublicPolicy=False),
        )

        self.assertEqual("FAIL", result["status"])
        self.assertIn("BlockPublicPolicy", result["message"])

    def test_multiple_false_settings_are_listed_in_fixed_order(self) -> None:
        result, _ = self.run_checker(
            response=valid_configuration(
                BlockPublicAcls=False,
                RestrictPublicBuckets=False,
            ),
        )

        self.assertEqual("FAIL", result["status"])
        self.assertIn(
            "BlockPublicAcls, RestrictPublicBuckets",
            result["message"],
        )

    def test_no_configuration_api_error_returns_fail(self) -> None:
        result, _ = self.run_checker(
            error=FakeAwsApiError(
                "NoSuchPublicAccessBlockConfiguration",
            ),
        )

        self.assertEqual("FAIL", result["status"])
        self.assertNotIn("details", result)

    def test_other_api_error_returns_sanitized_error(self) -> None:
        result, _ = self.run_checker(
            error=FakeAwsApiError("AccessDenied"),
        )

        serialized_result = json.dumps(result)
        self.assertEqual("ERROR", result["status"])
        self.assertNotIn("details", result)
        self.assertNotIn("sensitive exception text", serialized_result)
        self.assertNotIn("sensitive API message", serialized_result)
        self.assertNotIn("sensitive-request-id", serialized_result)
        self.assertNotIn(DUMMY_ACCOUNT_ID, serialized_result)

    def test_missing_configuration_returns_error(self) -> None:
        result, _ = self.run_checker(response={})

        self.assertEqual("ERROR", result["status"])
        self.assertNotIn("details", result)

    def test_invalid_configuration_type_returns_error(self) -> None:
        result, _ = self.run_checker(
            response={"PublicAccessBlockConfiguration": []},
        )

        self.assertEqual("ERROR", result["status"])

    def test_missing_boolean_setting_returns_error(self) -> None:
        configuration = valid_configuration()
        del configuration["PublicAccessBlockConfiguration"][
            "RestrictPublicBuckets"
        ]

        result, _ = self.run_checker(response=configuration)

        self.assertEqual("ERROR", result["status"])

    def test_non_boolean_setting_returns_error(self) -> None:
        result, _ = self.run_checker(
            response=valid_configuration(BlockPublicAcls=1),
        )

        self.assertEqual("ERROR", result["status"])

    def test_non_mapping_response_returns_error(self) -> None:
        result, _ = self.run_checker(response=[])

        self.assertEqual("ERROR", result["status"])


if __name__ == "__main__":
    unittest.main()
