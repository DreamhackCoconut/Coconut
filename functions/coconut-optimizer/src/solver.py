from __future__ import annotations

from typing import Any

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from .models import OptimizationRequest, OptimizationResponse, OptimizedRoute, RouteGeoJson


class NoFeasibleRoute(RuntimeError):
    """Raised when the constraints cannot produce a complete route."""


def _integer_matrix(matrix: list[list[float]]) -> list[list[int]]:
    return [[int(round(value)) for value in row] for row in matrix]


def solve(request: OptimizationRequest) -> OptimizationResponse:
    location_count = len(request.stops) + 1
    vehicle_count = len(request.vehicles)
    distances = _integer_matrix(request.distanceMatrixMeters)
    durations = _integer_matrix(request.durationMatrixSeconds)
    manager = pywrapcp.RoutingIndexManager(location_count, vehicle_count, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        return distances[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]

    distance_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_index)

    def duration_callback(from_index: int, to_index: int) -> int:
        # A fixed twenty-minute handoff makes time windows operationally meaningful.
        node = manager.IndexToNode(from_index)
        service_seconds = 20 * 60 if node > 0 else 0
        return durations[node][manager.IndexToNode(to_index)] + service_seconds

    duration_index = routing.RegisterTransitCallback(duration_callback)
    routing.AddDimension(
        duration_index,
        24 * 60 * 60,
        request.hubCutoffMinute * 60,
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")
    for vehicle_index in range(vehicle_count):
        time_dimension.CumulVar(routing.Start(vehicle_index)).SetRange(request.hubOpeningMinute * 60, request.hubCutoffMinute * 60)
        time_dimension.CumulVar(routing.End(vehicle_index)).SetRange(request.hubOpeningMinute * 60, request.hubCutoffMinute * 60)
    for stop_index, stop in enumerate(request.stops, start=1):
        index = manager.NodeToIndex(stop_index)
        time_dimension.CumulVar(index).SetRange(stop.earliestMinute * 60, stop.latestMinute * 60)

    weight_demands = [0] + [int(round(stop.weightKg * 1000)) for stop in request.stops]

    def weight_callback(from_index: int) -> int:
        return weight_demands[manager.IndexToNode(from_index)]

    weight_index = routing.RegisterUnaryTransitCallback(weight_callback)
    routing.AddDimensionWithVehicleCapacity(
        weight_index,
        0,
        [int(round(vehicle.maxWeightKg * 1000)) for vehicle in request.vehicles],
        True,
        "Weight",
    )

    volume_demands = [0] + [int(round(stop.volumeM3 * 1000000)) for stop in request.stops]

    def volume_callback(from_index: int) -> int:
        return volume_demands[manager.IndexToNode(from_index)]

    volume_index = routing.RegisterUnaryTransitCallback(volume_callback)
    routing.AddDimensionWithVehicleCapacity(
        volume_index,
        0,
        [int(round(vehicle.maxVolumeM3 * 1000000)) for vehicle in request.vehicles],
        True,
        "Volume",
    )

    search = pywrapcp.DefaultRoutingSearchParameters()
    search.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search.time_limit.FromSeconds(request.timeLimitSeconds)
    search.log_search = False
    solution = routing.SolveWithParameters(search)
    if solution is None:
        raise NoFeasibleRoute("OR-Tools could not satisfy capacity and pickup time-window constraints")

    routes: list[OptimizedRoute] = []
    geometry_coordinates: list[list[float]] = []
    for vehicle_index, vehicle in enumerate(request.vehicles):
        index = routing.Start(vehicle_index)
        stop_indices: list[int] = []
        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node > 0:
                stop_indices.append(node - 1)
            index = solution.Value(routing.NextVar(index))
        if not stop_indices:
            continue
        node_sequence = [0] + [stop_index + 1 for stop_index in stop_indices] + [0]
        distance_meters = sum(distances[a][b] for a, b in zip(node_sequence, node_sequence[1:]))
        duration_seconds = sum(durations[a][b] for a, b in zip(node_sequence, node_sequence[1:])) + len(stop_indices) * 20 * 60
        routes.append(
            OptimizedRoute(
                vehicleId=vehicle.id,
                stopIndices=stop_indices,
                sellerIds=[request.stops[i].sellerId for i in stop_indices],
                distanceMeters=float(distance_meters),
                durationSeconds=float(duration_seconds),
                loadWeightKg=sum(request.stops[i].weightKg for i in stop_indices),
                loadVolumeM3=sum(request.stops[i].volumeM3 for i in stop_indices),
            )
        )
        geometry_coordinates.append([request.hub.longitude, request.hub.latitude])
        geometry_coordinates.extend([[request.stops[i].longitude, request.stops[i].latitude] for i in stop_indices])
        geometry_coordinates.append([request.hub.longitude, request.hub.latitude])

    visited = {stop_index for route in routes for stop_index in route.stopIndices}
    if len(visited) != len(request.stops):
        raise NoFeasibleRoute("OR-Tools returned an incomplete pickup assignment")
    return OptimizationResponse(
        routes=routes,
        totalDistanceMeters=sum(route.distanceMeters for route in routes),
        totalDurationSeconds=sum(route.durationSeconds for route in routes),
        objectiveValue=float(solution.ObjectiveValue()),
        routeGeoJson=RouteGeoJson(geometry={"type": "LineString", "coordinates": geometry_coordinates}),
    )
