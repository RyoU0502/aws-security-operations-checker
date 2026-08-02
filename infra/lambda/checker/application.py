from __future__ import annotations

import json
import uuid
from collections.abc import Callable, Mapping, Sequence
from datetime import datetime, timezone
from typing import Protocol

from models import Checker, CheckRun, LambdaResponse
from runner import run_checkers


class ResultsTable(Protocol):
    def put_item(self, *, Item: Mapping[str, object]) -> object:
        ...


def _new_result_id() -> str:
    return str(uuid.uuid4())


def _checked_at_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def execute_check_run(
    *,
    checkers: Sequence[Checker],
    table: ResultsTable,
    env_name: str,
    result_id_factory: Callable[[], str] = _new_result_id,
    checked_at_factory: Callable[[], str] = _checked_at_now,
) -> LambdaResponse:
    checked_at = checked_at_factory()
    results, summary = run_checkers(checkers, checked_at)

    check_run: CheckRun = {
        "schemaVersion": 2,
        "resultId": result_id_factory(),
        "checkedAt": checked_at,
        "envName": env_name,
        "message": "Check run completed.",
        "summary": summary,
        "results": results,
    }

    table.put_item(Item=check_run)

    return {
        "statusCode": 200,
        "body": json.dumps(check_run),
    }
