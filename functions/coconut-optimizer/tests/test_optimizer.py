from src.models import OptimizationRequest
from src.solver import solve


def request() -> OptimizationRequest:
    return OptimizationRequest(
        hub={"latitude": -21.205, "longitude": -159.776},
        stops=[
            {"sellerId": "s1", "sellerName": "One", "latitude": -21.20, "longitude": -159.78, "weightKg": 2, "volumeM3": 0.1, "earliestMinute": 480, "latestMinute": 960},
            {"sellerId": "s2", "sellerName": "Two", "latitude": -21.21, "longitude": -159.77, "weightKg": 3, "volumeM3": 0.1, "earliestMinute": 480, "latestMinute": 960},
        ],
        vehicles=[{"id": "van-01", "maxWeightKg": 10, "maxVolumeM3": 0.5}],
        distanceMatrixMeters=[[0, 1000, 1200], [1000, 0, 800], [1200, 800, 0]],
        durationMatrixSeconds=[[0, 120, 180], [120, 0, 90], [180, 90, 0]],
    )


def test_solver_starts_and_ends_at_hub_and_visits_every_stop():
    result = solve(request())
    assert result.optimizerMode == "ortools"
    assert set(result.routes[0].stopIndices) == {0, 1}
    assert result.totalDistanceMeters == 3000
    assert result.routeGeoJson.geometry["coordinates"][0] == [-159.776, -21.205]


def test_matrix_shape_is_rejected():
    payload = request().model_dump()
    payload["distanceMatrixMeters"] = [[0, 1], [1, 0]]
    try:
        OptimizationRequest.model_validate(payload)
    except ValueError as exc:
        assert "square matrix" in str(exc)
    else:
        raise AssertionError("invalid matrix should be rejected")
