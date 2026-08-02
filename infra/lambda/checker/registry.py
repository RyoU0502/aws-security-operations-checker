from __future__ import annotations

from models import Checker
from checkers.s3_account_public_access_block import (
    S3AccountPublicAccessBlockChecker,
    S3ControlClient,
)


def create_registry(
    *,
    s3_control_client: S3ControlClient,
    account_id: str,
) -> list[Checker]:
    return [
        S3AccountPublicAccessBlockChecker(
            s3_control_client=s3_control_client,
            account_id=account_id,
        ),
    ]
