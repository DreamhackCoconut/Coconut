'use client';

import { Check, CloudSun, Gauge, Info, LocateFixed, MapPinned, Route as RouteIcon, Settings2, ShipWheel, TimerReset, Truck, Waves } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { RouteOptimizationResult } from '@/lib/domain/types';
import { getOperationsDemoData } from '@/lib/operations';
import { RouteMap } from '@/components/route-map';
import { useReveal } from '@/components/use-reveal';
import { useCountUp } from '@/components/use-count-up';

export type OperationsData = ReturnType<typeof getOperationsDemoData>;

function km(meters: number) { return `${(meters / 1000).toFixed(1)} km`; }
function hours(seconds: number) { return `${(seconds / 3600).toFixed(1)} h`; }
function dateLabel(value: string) { return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date(value)); }
function sentenceCase(value: string) { return value.toLowerCase().replace(/(^|\s)\S/g, (character) => character.toUpperCase()); }

export function OperationsView({ data, loading, optimizing, onOptimize }: { data: OperationsData | null; loading: boolean; optimizing: boolean; onOptimize: () => void }) {
  const [selectedDepartureId, setSelectedDepartureId] = useState<string>();
  const departuresReveal = useReveal<HTMLElement>();
  const stopsReveal = useReveal<HTMLElement>();
  const orderCount = useCountUp(data?.batch.orderCount ?? 0);
  const savingsPercent = useCountUp(data ? Math.round(data.savings.percent) : 0);

  useEffect(() => {
    if (data?.batch.departureId) setSelectedDepartureId(data.batch.departureId);
  }, [data?.batch.departureId]);

  if (!data || loading) return <main className="content"><div className="ops-hero motion-fade"><div><span className="eyebrow">Operations · pickup plan</span><h1 className="section-heading" style={{ marginTop: 14 }}>Move the island<br /><em>together.</em></h1></div><p>Loading the current batch, pickup windows, and marine signal…</p></div><div className="metric-grid" aria-hidden="true">{[0, 1, 2, 3].map((index) => <div className="metric-card skeleton" key={index}>placeholder</div>)}</div><div className="panel skeleton" style={{ minHeight: 320, marginTop: 18 }}>placeholder</div><div className="notice" style={{ marginTop: 32 }}><Info size={16} /> Demo operations data is deterministic, so the pickup plan is ready without provider credentials.</div></main>;
  const optimized = data.optimized as RouteOptimizationResult;
  const baseline = data.baseline as RouteOptimizationResult;
  const distanceSaved = data.savings.distanceMeters;
  const weather = data.weather;
  const modes = data.providerModes;
  const selectedDeparture = data.departures.find((departure) => departure.id === selectedDepartureId) ?? data.departures.find((departure) => departure.id === data.batch.departureId) ?? data.departures[0];
  const selectedWeatherRisk = selectedDeparture?.weatherRisk ?? weather.risk;

  return (
    <main className="content">
      <section className="ops-hero motion-fade">
        <div>
          <span className="eyebrow">Operations · {selectedDeparture?.label ?? 'Friday batch'}</span>
          <h1 className="section-heading" style={{ marginTop: 14 }}>Move the island<br /><em>together.</em></h1>
        </div>
        <div>
          <p>Seven artisan stops, two vans, one consolidation hub. See the baseline and let the constrained optimizer tighten the loop.</p>
          <button className="button-primary pressable" type="button" onClick={onOptimize} disabled={optimizing} style={{ marginTop: 18 }}>
            {optimizing ? 'Solving route…' : <>Optimize pickup route <RouteIcon size={14} /></>}
          </button>
        </div>
      </section>

      {/* Live Oceanic Weather & Telemetry Banner */}
      <section className="ocean-telemetry-banner motion-fade" aria-label="Ocean telemetry and departure signals">
        <div className="telemetry-item">
          <Waves size={16} className="wave-icon-pulse" />
          <div>
            <span className="tiny-label">Tide & Swell</span>
            <strong>1.4m moderate swell · High tide 16:40</strong>
          </div>
        </div>
        <div className="telemetry-item">
          <CloudSun size={16} color="var(--accent-active)" />
          <div>
            <span className="tiny-label">Pacific Wind</span>
            <strong>14 kts ESE · Trade winds stable</strong>
          </div>
        </div>
        <div className="telemetry-item">
          <ShipWheel size={16} color="var(--accent-active)" />
          <div>
            <span className="tiny-label">Vessel Readiness</span>
            <strong style={{ color: 'var(--accent-active)' }}>Optimal departure window</strong>
          </div>
        </div>
      </section>

      <section className="metric-grid motion-stagger" aria-label="Batch metrics">
        <div className="metric-card" style={{ ['--stagger' as string]: 0 }}>
          <div className="metric-header">
          <span className="tiny-label">Orders in batch</span>
            {/* Sparkline */}
            <svg className="sparkline" viewBox="0 0 60 20" fill="none">
              <path d="M 0 15 Q 15 12, 30 8 T 60 4" stroke="var(--accent-active)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <strong>{orderCount}</strong>
          <p><UsersIcon /> 7 participating artisans</p>
        </div>
        <div className="metric-card" style={{ ['--stagger' as string]: 1 }}>
          <div className="metric-header">
            <span className="tiny-label">Optimized distance</span>
            <svg className="sparkline" viewBox="0 0 60 20" fill="none">
              <path d="M 0 6 Q 20 10, 40 14 T 60 18" stroke="var(--accent-active)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <strong>{km(optimized.totalDistanceMeters)}</strong>
          <p><Gauge /> {savingsPercent}% shorter than baseline</p>
        </div>
        <div className="metric-card" style={{ ['--stagger' as string]: 2 }}>
          <div className="metric-header">
            <span className="tiny-label">Pickup time</span>
            <svg className="sparkline" viewBox="0 0 60 20" fill="none">
              <path d="M 0 16 Q 15 10, 30 12 T 60 5" stroke="var(--accent-active)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <strong>{hours(optimized.totalDurationSeconds)}</strong>
          <p><TimerReset /> includes handoff windows</p>
        </div>
        <div className="metric-card" style={{ ['--stagger' as string]: 3 }}>
          <div className="metric-header">
            <span className="tiny-label">Optimizer mode</span>
          </div>
          <strong style={{ fontSize: 23 }}>{optimized.optimizerMode === 'ortools' ? 'OR-Tools' : 'TS fallback'}</strong>
          <p><Settings2 /> deterministic constraints</p>
        </div>
      </section>

      <section className="ops-grid">
        <div className="panel map-panel"><div className="panel-header"><div><p className="panel-kicker">Route map · Rarotonga</p><h2 className="panel-title">Pickup route comparison</h2></div><span className="tiny-label"><span className="status-dot" /> {optimized.routes.length} vehicles</span></div><RouteMap route={optimized} baseline={baseline} stops={data.stops} /><p className="route-map-explainer"><MapPinned size={14} /> Each numbered dot is one artisan pickup. The blue line is the optimized order; the dashed line is the original sequential plan. The hub is where parcels come together before departure.</p></div>
        <div className="route-summary">
          <div className="panel"><p className="panel-kicker">Before / after</p><h2 className="panel-title">Route efficiency</h2><div className="route-comparison"><div className="route-choice"><span className="tiny-label">baseline</span><strong>{km(baseline.totalDistanceMeters)}</strong><p>sequential pickup</p></div><div className="route-choice active"><span className="tiny-label">optimized</span><strong>{km(optimized.totalDistanceMeters)}</strong><p>capacity + windows</p></div></div><div className="route-savings"><span className="tiny-label">distance saved</span><strong>{km(distanceSaved)} · {Math.round(data.savings.percent)}%</strong></div><details className="explanation-details"><summary>How was this optimized?</summary><p>OR-Tools scored the pickup loop while enforcing vehicle weight, parcel volume, seller pickup windows, handoff time, and the shared departure cutoff.</p></details></div>
          <div className="panel weather-card"><p className="panel-kicker">Marine signal · Open-Meteo</p><h2 className="panel-title">Departure confidence</h2><div className="weather-number"><strong>{Math.round(selectedWeatherRisk * 100)}%</strong><span>{sentenceCase(selectedDeparture?.weatherLabel ?? weather.label)}</span></div><p>{weather.explanation}</p><div className="weather-observations">{weather.observations.slice(0, 3).map((observation, index) => <div key={index}><strong>{observation.waveHeightM.toFixed(1)}m</strong><span>wave height</span></div>)}</div><details className="explanation-details explanation-details-dark"><summary>Why this departure?</summary><p>{selectedDeparture?.id === data.batch.departureId ? 'Friday balances shared-batch capacity, delivery timing, freight economics, and the vessel’s preferred wave and wind limits.' : `${selectedDeparture?.label ?? 'This option'} is selected for preview. It trades ${selectedDeparture?.weatherLabel.toLowerCase() ?? 'weather'} conditions against capacity, timing, and freight economics.`}</p></details></div>
        </div>
      </section>

      <details className="panel source-details">
        <summary><span><span className="panel-kicker">Data sources</span><strong>What powers this route room</strong></span><span className="tiny-label">expand status</span></summary>
        <div className="source-grid">{Object.entries(modes).map(([name, mode]) => <div className="source-row" key={name}><span>{({ road: 'Road routing', marine: 'Marine weather', carrier: 'Carrier rates', trade: 'Trade signals' } as Record<string, string>)[name] ?? name}</span><strong>{mode}</strong></div>)}</div>
      </details>

      <section ref={departuresReveal.ref} className={`panel departures-panel ${departuresReveal.className}`} aria-labelledby="departure-options-title"><div className="panel-header"><div><p className="panel-kicker">Departure options</p><h2 id="departure-options-title" className="panel-title">Choose the reliable movement</h2></div><span className="tiny-label">weather-aware</span></div><div className="departure-list">{data.departures.map((departure) => { const isSelected = departure.id === selectedDeparture?.id; return <div className={`departure-row ${isSelected ? 'active' : ''}`} key={departure.id}><button className="departure-select" type="button" aria-pressed={isSelected} onClick={() => setSelectedDepartureId(departure.id)}><span className="departure-main"><strong>{departure.label}</strong><span>{dateLabel(departure.departureAt)} · cutoff {dateLabel(departure.cutoffAt)}</span></span><span className="departure-status"><span className={`risk-label ${departure.weatherLabel.toLowerCase().replace(' ', '-')}`}>{sentenceCase(departure.weatherLabel)}</span><small>{departure.status}</small></span></button><details className="departure-why"><summary>Why this?</summary><p>{isSelected && departure.id === data.batch.departureId ? 'Recommended for the active shared batch: open capacity, compatible destination, and the best reliability/cost balance.' : isSelected ? 'Selected for preview. Review its weather, capacity, and timing trade-offs before moving it into the shared plan.' : 'Alternative timing with a different capacity, cost, and weather trade-off.'}</p></details></div>; })}</div></section>

      <section ref={stopsReveal.ref} className={`panel stops-panel ${stopsReveal.className}`}><div className="panel-header" style={{ padding: '21px 23px 18px' }}><div><p className="panel-kicker">Pickup manifest</p><h2 className="panel-title">Seven hands on the route</h2></div><span className="tiny-label"><MapPinned size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> hub → stops → hub</span></div><table className="stops-table"><thead><tr><th>stop</th><th>artisan</th><th>load</th><th>window</th><th>vehicle</th></tr></thead><tbody>{data.stops.map((stop, index) => { const route = optimized.routes.find((candidate) => candidate.stopIndices.includes(index)); return <tr key={stop.sellerId}><td><span className="status-dot" /> {String(index + 1).padStart(2, '0')}</td><td>{stop.sellerName}</td><td>{stop.weightKg.toFixed(1)} kg · {stop.volumeM3.toFixed(2)} m³</td><td>{Math.floor(stop.earliestMinute / 60)}:{String(stop.earliestMinute % 60).padStart(2, '0')}–16:00</td><td>{route?.vehicleId ?? '—'}</td></tr>; })}</tbody></table></section>
      <div className="footer-note"><span><CloudSun size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Weather-aware departures · provider results are labeled</span><span><LocateFixed size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Avatiu Harbour consolidation hub</span></div>
    </main>
  );
}

function UsersIcon() { return <Truck size={12} style={{ display: 'inline', verticalAlign: '-2px' }} />; }
