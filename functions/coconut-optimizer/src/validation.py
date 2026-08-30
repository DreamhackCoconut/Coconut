from __future__ import annotations

from .models import OptimizationRequest


def validate_request(payload: object) -> OptimizationRequest:
    """Parse and enforce the hard safety caps before OR-Tools sees any input."""
    return OptimizationRequest.model_validate(payload)
