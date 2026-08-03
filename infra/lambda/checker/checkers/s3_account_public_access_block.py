from __future__ import annotations

from collections.abc import Mapping
from typing import Protocol

from models import CheckResult, CheckSeverity, CheckStatus


REQUIRED_SETTINGS = (
    "BlockPublicAcls",
    "IgnorePublicAcls",
    "BlockPublicPolicy",
    "RestrictPublicBuckets",
)


class S3ControlClientExceptions(Protocol):
    NoSuchPublicAccessBlockConfiguration: type[Exception]


class S3ControlClient(Protocol):
    exceptions: S3ControlClientExceptions

    def get_public_access_block(
        self,
        *,
        AccountId: str,
    ) -> Mapping[str, object]:
        ...


class S3AccountPublicAccessBlockChecker:
    checker_id = "s3-account-public-access-block"
    name = "S3 Account Public Access Block"
    severity: CheckSeverity = "MEDIUM"

    def __init__(
        self,
        *,
        s3_control_client: S3ControlClient,
        account_id: str,
    ) -> None:
        self._s3_control_client = s3_control_client
        self._account_id = account_id

    def _result(
        self,
        *,
        status: CheckStatus,
        message: str,
        checked_at: str,
        details: dict[str, object] | None = None,
    ) -> CheckResult:
        result: CheckResult = {
            "checkId": self.checker_id,
            "checkName": self.name,
            "status": status,
            "severity": self.severity,
            "message": message,
            "resourceId": "account",
            "checkedAt": checked_at,
        }

        if details is not None:
            result["details"] = details

        return result

    def _invalid_response_result(self, checked_at: str) -> CheckResult:
        return self._result(
            status="ERROR",
            message=(
                "Unable to evaluate account-level S3 Block Public Access "
                "because the API response was incomplete or invalid."
            ),
            checked_at=checked_at,
        )

    def _evaluate_response(
        self,
        response: object,
        checked_at: str,
    ) -> CheckResult:
        if not isinstance(response, Mapping):
            return self._invalid_response_result(checked_at)

        configuration = response.get("PublicAccessBlockConfiguration")

        if not isinstance(configuration, Mapping):
            return self._invalid_response_result(checked_at)

        settings: dict[str, bool] = {}

        for setting_name in REQUIRED_SETTINGS:
            setting_value = configuration.get(setting_name)

            if type(setting_value) is not bool:
                return self._invalid_response_result(checked_at)

            settings[setting_name] = setting_value

        details: dict[str, object] = {
            "BlockPublicAcls": settings["BlockPublicAcls"],
            "IgnorePublicAcls": settings["IgnorePublicAcls"],
            "BlockPublicPolicy": settings["BlockPublicPolicy"],
            "RestrictPublicBuckets": settings["RestrictPublicBuckets"],
        }
        disabled_settings = [
            setting_name
            for setting_name in REQUIRED_SETTINGS
            if not settings[setting_name]
        ]

        if disabled_settings:
            return self._result(
                status="FAIL",
                message=(
                    "Account-level S3 Block Public Access is incomplete; "
                    f"disabled settings: {', '.join(disabled_settings)}."
                ),
                checked_at=checked_at,
                details=details,
            )

        return self._result(
            status="PASS",
            message=(
                "All account-level S3 Block Public Access settings are "
                "enabled."
            ),
            checked_at=checked_at,
            details=details,
        )

    def run(self, checked_at: str) -> list[CheckResult]:
        client_exceptions = self._s3_control_client.exceptions
        not_configured_error = (
            client_exceptions.NoSuchPublicAccessBlockConfiguration
        )

        try:
            response = self._s3_control_client.get_public_access_block(
                AccountId=self._account_id,
            )
        except not_configured_error:
            return [
                self._result(
                    status="FAIL",
                    message=(
                        "Account-level S3 Block Public Access "
                        "configuration is not set."
                    ),
                    checked_at=checked_at,
                )
            ]

        return [self._evaluate_response(response, checked_at)]
