from __future__ import annotations

import json

from pydantic import ValidationError

from src.solver import NoFeasibleRoute, solve
from src.validation import validate_request


def _body(context: object) -> object:
    request = context.req
    if request.body_json is not None:
        return request.body_json
    if not request.body:
        return {}
    return json.loads(request.body)


def main(context):
    context.log("Coconut OR-Tools optimizer request")
    try:
        request = validate_request(_body(context))
        result = solve(request)
        return context.res.json(result.model_dump(mode="json"))
    except (ValidationError, ValueError, NoFeasibleRoute, json.JSONDecodeError) as exc:
        context.error(str(exc))
        return context.res.json({"error": str(exc), "optimizerMode": "unavailable"}, 422)
    except Exception as exc:  # pragma: no cover - runtime guard for Appwrite execution failures
        context.error(str(exc))
        return context.res.json({"error": "Optimizer execution failed", "optimizerMode": "unavailable"}, 500)
