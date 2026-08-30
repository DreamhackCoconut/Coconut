from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


class Point(BaseModel):
    latitude: float
    longitude: float
    label: str | None = None


class Stop(BaseModel):
    sellerId: str = Field(min_length=1, max_length=80)
    sellerName: str = Field(min_length=1, max_length=160)
    latitude: float
    longitude: float
    weightKg: float = Field(ge=0, le=1000)
    volumeM3: float = Field(ge=0, le=100)
    earliestMinute: int = Field(ge=0, le=24 * 60)
    latestMinute: int = Field(ge=0, le=24 * 60)

    @model_validator(mode="after")
    def valid_window(self) -> "Stop":
        if self.latestMinute < self.earliestMinute:
            raise ValueError("latestMinute must be greater than or equal to earliestMinute")
        return self


class Vehicle(BaseModel):
    id: str = Field(min_length=1, max_length=80)
    maxWeightKg: float = Field(gt=0, le=1000)
    maxVolumeM3: float = Field(gt=0, le=100)


class OptimizationRequest(BaseModel):
    hub: Point
    stops: list[Stop] = Field(min_length=1, max_length=25)
    vehicles: list[Vehicle] = Field(min_length=1, max_length=5)
    distanceMatrixMeters: list[list[float]]
    durationMatrixSeconds: list[list[float]]
    timeLimitSeconds: int = Field(default=3, ge=1, le=10)
    hubOpeningMinute: int = Field(default=8 * 60, ge=0, le=24 * 60)
    hubCutoffMinute: int = Field(default=17 * 60, ge=0, le=24 * 60)

    @model_validator(mode="after")
    def valid_matrices_and_limits(self) -> "OptimizationRequest":
        size = len(self.stops) + 1
        for name, matrix in (("distanceMatrixMeters", self.distanceMatrixMeters), ("durationMatrixSeconds", self.durationMatrixSeconds)):
            if len(matrix) != size or any(len(row) != size for row in matrix):
                raise ValueError(f"{name} must be a square matrix with one hub plus every stop")
            for row in matrix:
                for value in row:
                    if value < 0 or value != value or value in (float("inf"), float("-inf")):
                        raise ValueError(f"{name} contains a negative, NaN, or infinite value")
        if self.hubCutoffMinute <= self.hubOpeningMinute:
            raise ValueError("hubCutoffMinute must be after hubOpeningMinute")
        if any(stop.latestMinute > self.hubCutoffMinute for stop in self.stops):
            raise ValueError("stop time window exceeds the hub cutoff")
        total_weight = sum(stop.weightKg for stop in self.stops)
        total_volume = sum(stop.volumeM3 for stop in self.stops)
        if total_weight > sum(vehicle.maxWeightKg for vehicle in self.vehicles) + 1e-9:
            raise ValueError("pickup stops exceed total vehicle weight capacity")
        if total_volume > sum(vehicle.maxVolumeM3 for vehicle in self.vehicles) + 1e-9:
            raise ValueError("pickup stops exceed total vehicle volume capacity")
        return self


class OptimizedRoute(BaseModel):
    vehicleId: str
    stopIndices: list[int]
    sellerIds: list[str]
    distanceMeters: float
    durationSeconds: float
    loadWeightKg: float
    loadVolumeM3: float


class RouteGeoJson(BaseModel):
    type: Literal["Feature"] = "Feature"
    properties: dict[str, str | float] = {"mode": "ortools"}
    geometry: dict[str, object]


class OptimizationResponse(BaseModel):
    routes: list[OptimizedRoute]
    totalDistanceMeters: float
    totalDurationSeconds: float
    objectiveValue: float
    optimizerMode: Literal["ortools"] = "ortools"
    routeGeoJson: RouteGeoJson
