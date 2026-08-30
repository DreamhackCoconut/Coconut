'use client';

import maplibregl from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import type { RouteOptimizationResult, RouteStop } from '@/lib/domain/types';

export function RouteMap({ route, baseline, stops }: { route: RouteOptimizationResult; baseline?: RouteOptimizationResult; stops: RouteStop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasGeographicBasemap, setHasGeographicBasemap] = useState(false);
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
    setHasGeographicBasemap(false);
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
    const markerInstances: maplibregl.Marker[] = [];
    const map = new maplibregl.Map({
      container: containerRef.current,
      attributionControl: { compact: true },
      center: [-159.776, -21.205],
      zoom: 10.8,
      // OpenFreeMap supplies a real OSM-derived geographic basemap without a
      // browser token. The schematic underneath remains available offline.
      style: 'https://tiles.openfreemap.org/styles/positron',
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('coconut-route', { type: 'geojson', data: routeData });
      map.addSource('coconut-baseline', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection' as const,
          features: baselineRouteCoordinates.length > 1 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: baselineRouteCoordinates } }] : [],
        },
      });
      map.addLayer({ id: 'coconut-baseline', type: 'line', source: 'coconut-baseline', minzoom: 5, paint: { 'line-color': '#647784', 'line-width': 2, 'line-opacity': 0.78, 'line-dasharray': [2, 2] } });
      map.addLayer({ id: 'coconut-route-casing', type: 'line', source: 'coconut-route', paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.92 } });
      map.addLayer({ id: 'coconut-route', type: 'line', source: 'coconut-route', paint: { 'line-color': '#e86348', 'line-width': 4, 'line-opacity': 0.98 } });

      // HTML markers stay above the external style and keep the numbered pickup
      // story reliable across MapLibre styles and zoom levels.
      stops.forEach((stop, index) => {
        const element = document.createElement('div');
        element.className = 'route-stop-marker';
        element.textContent = String(index + 1);
        element.setAttribute('aria-hidden', 'true');
        element.title = `${index + 1}. ${stop.sellerName}`;
        markerInstances.push(new maplibregl.Marker({ element, anchor: 'center' }).setLngLat([stop.longitude, stop.latitude]).addTo(map));
      });

      const hubElement = document.createElement('div');
      hubElement.className = 'route-hub-marker';
      hubElement.textContent = 'H';
      hubElement.setAttribute('aria-hidden', 'true');
      hubElement.title = 'Avatiu Harbour consolidation hub';
      markerInstances.push(new maplibregl.Marker({ element: hubElement, anchor: 'center' }).setLngLat(hubData.geometry.coordinates).addTo(map));

      setHasGeographicBasemap(true);
      if (!coordinates.length) return;
      const bounds = new maplibregl.LngLatBounds();
      [...coordinates, ...baselineRouteCoordinates, ...stopData.features.map((feature) => feature.geometry.coordinates)].forEach(([longitude, latitude]) => bounds.extend([longitude, latitude]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 12.4, duration: 500 });
    });
    return () => {
      markerInstances.forEach((marker) => marker.remove());
      map.remove();
    };
  }, [route, baseline, stops]);

  return (
    <div className="route-map" role="img" aria-label={`Route map showing ${stops.length} artisan stops, an optimized route, and a baseline route for comparison`}>
      {!hasGeographicBasemap ? <svg className="route-map-schematic" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
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
      </svg> : null}
      <div className="route-map__canvas" ref={containerRef} />
      <div className="map-legend" aria-label="Map key">
        <span><i className="legend-line optimized" /> optimized route</span>
        <span><i className="legend-line baseline" /> original route</span>
        <span><i className="legend-dot" /> numbered artisan pickup</span>
        <span><i className="legend-dot hub" /> consolidation hub</span>
      </div>
    </div>
  );
}
