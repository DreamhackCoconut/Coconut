'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { RouteOptimizationResult, RouteStop } from '@/lib/domain/types';

export function RouteMap({ route, baseline, stops }: { route: RouteOptimizationResult; baseline?: RouteOptimizationResult; stops: RouteStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const routeCoordinates = route.routeGeoJson.geometry.coordinates;
  const baselineCoordinates = baseline?.routeGeoJson.geometry.coordinates ?? [];
  const mapCoordinates = [...routeCoordinates, ...baselineCoordinates, ...stops.map((stop) => [stop.longitude, stop.latitude] as [number, number])];
  const longitudes = mapCoordinates.map(([longitude]) => longitude);
  const latitudes = mapCoordinates.map(([, latitude]) => latitude);
  const minLongitude = Math.min(...longitudes, -159.8);
  const maxLongitude = Math.max(...longitudes, -159.75);
  const minLatitude = Math.min(...latitudes, -21.25);
  const maxLatitude = Math.max(...latitudes, -21.18);
  const longitudeRange = Math.max(0.001, maxLongitude - minLongitude);
  const latitudeRange = Math.max(0.001, maxLatitude - minLatitude);
  const toSchematicPoint = ([longitude, latitude]: [number, number]) => `${8 + ((longitude - minLongitude) / longitudeRange) * 84},${8 + ((maxLatitude - latitude) / latitudeRange) * 84}`;

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const coordinates = route.routeGeoJson.geometry.coordinates;
    const baselineRouteCoordinates = baseline?.routeGeoJson.geometry.coordinates ?? [];
    const routeData = {
      type: 'Feature' as const,
      properties: route.routeGeoJson.properties,
      geometry: { type: 'LineString' as const, coordinates },
    };
    const stopData = {
      type: 'FeatureCollection' as const,
      features: stops.map((stop, index) => ({
        type: 'Feature' as const,
        properties: { label: stop.sellerName, index: index + 1 },
        geometry: { type: 'Point' as const, coordinates: [stop.longitude, stop.latitude] as [number, number] },
      })),
    };
    const hubData = {
      type: 'Feature' as const,
      properties: { label: 'Avatiu Harbour consolidation hub' },
      geometry: { type: 'Point' as const, coordinates: coordinates[0] ?? [-159.776, -21.205] as [number, number] },
    };
    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: { compact: true },
      center: [-159.776, -21.205],
      zoom: 10.8,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' },
          route: { type: 'geojson', data: routeData },
          baseline: { type: 'geojson', data: { type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: baselineRouteCoordinates } } },
          stops: { type: 'geojson', data: stopData },
          hub: { type: 'geojson', data: hubData },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
          { id: 'baseline', type: 'line', source: 'baseline', minzoom: 5, paint: { 'line-color': '#64748b', 'line-width': 2, 'line-opacity': 0.75, 'line-dasharray': [2, 2] } },
          { id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.9 } },
          { id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-opacity': 0.98 } },
          { id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-color': '#ffffff', 'circle-radius': 8, 'circle-stroke-color': '#2563eb', 'circle-stroke-width': 3 } },
          { id: 'stop-labels', type: 'symbol', source: 'stops', layout: { 'text-field': ['get', 'index'], 'text-size': 10, 'text-font': ['Open Sans Bold'], 'text-allow-overlap': true }, paint: { 'text-color': '#0f172a' } },
          { id: 'hub', type: 'circle', source: 'hub', paint: { 'circle-color': '#1e40af', 'circle-radius': 10, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 3 } },
        ],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      if (!coordinates.length) return;
      const bounds = new maplibregl.LngLatBounds();
      [...coordinates, ...baselineRouteCoordinates, ...stopData.features.map((feature) => feature.geometry.coordinates)].forEach(([longitude, latitude]) => bounds.extend([longitude, latitude]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 12.4, duration: 500 });
    });
    return () => map.remove();
  }, [route, baseline, stops]);

  return (
    <div className="route-map" role="img" aria-label={`Route map showing ${stops.length} artisan stops, an optimized route, and a baseline route for comparison`}>
      <svg className="route-map-schematic" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path className="schematic-grid" d="M8 22H92M8 42H92M8 62H92M8 82H92M24 8V92M44 8V92M64 8V92M84 8V92" />
        {baselineCoordinates.length > 1 ? <polyline className="schematic-baseline" points={baselineCoordinates.map(toSchematicPoint).join(' ')} /> : null}
        {routeCoordinates.length > 1 ? <polyline className="schematic-optimized" points={routeCoordinates.map(toSchematicPoint).join(' ')} /> : null}
        {stops.map((stop, index) => {
          const [cx, cy] = toSchematicPoint([stop.longitude, stop.latitude]).split(',');
          return (
            <g key={stop.sellerId}>
              <circle className="schematic-stop" cx={cx} cy={cy} r="2.5" />
              <text className="schematic-stop-label" x={cx} y={cy}>{index + 1}</text>
            </g>
          );
        })}
        {routeCoordinates[0] ? (() => {
          const [cx, cy] = toSchematicPoint(routeCoordinates[0]).split(',');
          return (
            <g key="avatiu-hub">
              <circle className="schematic-hub" cx={cx} cy={cy} r="3.5" />
              <text className="schematic-hub-label" x={Number(cx) + 5} y={Number(cy) - 4}>Avatiu hub</text>
            </g>
          );
        })() : null}
      </svg>
      <div className="route-map__canvas" ref={containerRef} />
      <div className="map-legend">
        <span><i className="legend-line optimized" /> Optimized</span>
        <span><i className="legend-line baseline" /> Baseline</span>
        <span><i className="legend-dot" /> Stop</span>
        <span><i className="legend-dot hub" /> Hub</span>
      </div>
    </div>
  );
}
