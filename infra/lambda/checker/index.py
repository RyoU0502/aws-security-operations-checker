import os

import boto3

from application import execute_check_run
from registry import create_registry


dynamodb = boto3.resource("dynamodb")
results_table = dynamodb.Table(os.environ["RESULTS_TABLE_NAME"])
s3_control_client = boto3.client("s3control")
checkers = create_registry(
    s3_control_client=s3_control_client,
    account_id=os.environ["CHECK_TARGET_ACCOUNT_ID"],
)


def handler(event, context):
    return execute_check_run(
        checkers=checkers,
        table=results_table,
        env_name=os.environ.get("ENV_NAME", "unknown"),
    )
