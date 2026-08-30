'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef } from 'react';
import type { RouteOptimizationResult, RouteStop } from '@/lib/domain/types';

export function RouteMap({ route, stops }: { route: RouteOptimizationResult; stops: RouteStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    const coordinates = route.routeGeoJson.geometry.coordinates;
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
    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: false,
      center: [-159.776, -21.205],
      zoom: 10.8,
      style: {
        version: 8,
        sources: {
          osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' },
          route: { type: 'geojson', data: routeData },
          stops: { type: 'geojson', data: stopData },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
          { id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#ef7158', 'line-width': 4, 'line-opacity': 0.9 } },
          { id: 'stops', type: 'circle', source: 'stops', paint: { 'circle-color': '#0b8c94', 'circle-radius': 6, 'circle-stroke-color': '#fffdf8', 'circle-stroke-width': 2 } },
        ],
      },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      if (!coordinates.length) return;
      const bounds = new maplibregl.LngLatBounds();
      coordinates.forEach(([longitude, latitude]) => bounds.extend([longitude, latitude]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 12.4, duration: 500 });
    });
    return () => map.remove();
  }, [route, stops]);

  return (
    <div className="route-map" role="img" aria-label="Map of the optimized island artisan pickup route">
      <div className="route-map__canvas" ref={containerRef} />
      <div className="map-legend">
        <span><i className="legend-line" /> route</span>
        <span><i className="legend-dot" /> artisan stop</span>
      </div>
    </div>
  );
}
