'use client';

import { Anchor, ArrowRight, CheckCircle2, Globe, MapPin, Navigation, Plane, Ship, ShieldCheck } from 'lucide-react';
import type { Destination } from '@/lib/domain/types';

export function RouteJourneyVisualizer({ destination }: { destination?: Destination }) {
  const destName = destination?.region ? `${destination.region}, ${destination.countryCode}` : 'West Coast, US';

  return (
    <div className="journey-visualizer motion-fade">
      <div className="journey-header">
        <div className="journey-title-wrap">
          <Globe size={16} color="var(--teal)" />
          <span className="tiny-label">Pacific Shared Corridor</span>
        </div>
        <span className="journey-status-pill">
          <span className="journey-pulse" aria-hidden="true" />
          Route in view
        </span>
      </div>

      <div className="journey-timeline">
        {/* Step 1: Island Hub */}
        <div className="journey-node active">
          <div className="node-icon-wrap origin">
            <Anchor size={14} />
          </div>
          <div className="node-info">
            <span className="node-type">Consolidation Hub</span>
            <strong>Rarotonga (CK)</strong>
            <small>Avatiu Port</small>
          </div>
        </div>

        {/* Animated Connector 1 */}
        <div className="journey-connector">
          <div className="connector-line">
            <span className="connector-pulse" />
          </div>
          <div className="transit-badge">
            <Ship size={11} />
            <span>Shared Vessel</span>
          </div>
        </div>

        {/* Step 2: Gateway Hub */}
        <div className="journey-node active">
          <div className="node-icon-wrap gateway">
            <Navigation size={14} />
          </div>
          <div className="node-info">
            <span className="node-type">Customs & Gateway</span>
            <strong>Auckland (NZ)</strong>
            <small>Direct Transshipment</small>
          </div>
        </div>

        {/* Animated Connector 2 */}
        <div className="journey-connector">
          <div className="connector-line">
            <span className="connector-pulse" style={{ animationDelay: '0.8s' }} />
          </div>
          <div className="transit-badge">
            <Plane size={11} />
            <span>Air Freight</span>
          </div>
        </div>

        {/* Step 3: Destination */}
        <div className="journey-node destination">
          <div className="node-icon-wrap dest">
            <MapPin size={14} />
          </div>
          <div className="node-info">
            <span className="node-type">Your Destination</span>
            <strong>{destName}</strong>
            <small>Final Mile Delivery</small>
          </div>
        </div>
      </div>
    </div>
  );
}
