from __future__ import annotations

import os

import boto3

from application import execute_check_run
from registry import create_registry


_ALLOWED_ENV_NAMES = frozenset({"dev", "prod"})


def _load_configuration() -> tuple[str, str, str]:
    results_table_name = os.environ["RESULTS_TABLE_NAME"]
    account_id = os.environ["CHECK_TARGET_ACCOUNT_ID"]
    env_name = os.environ["ENV_NAME"]

    if env_name not in _ALLOWED_ENV_NAMES:
        raise ValueError("Invalid ENV_NAME configuration.")

    return results_table_name, account_id, env_name


results_table_name, account_id, env_name = _load_configuration()
dynamodb = boto3.resource("dynamodb")
results_table = dynamodb.Table(results_table_name)
s3_control_client = boto3.client("s3control")
checkers = create_registry(
    s3_control_client=s3_control_client,
    account_id=account_id,
)


def handler(event, context):
    return execute_check_run(
        checkers=checkers,
        table=results_table,
        env_name=env_name,
    )
