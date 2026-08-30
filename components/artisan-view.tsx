'use client';

import { ArrowUpRight, BarChart3, Check, Clock3, Factory, MapPin, Sparkles, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import type { MarketOpportunity, Product, ProductionJob } from '@/lib/domain/types';
import type { SellerDashboard } from '@/lib/client-gateway';
import { getPriceGuidance } from '@/lib/engines/market-opportunity';

function shortDate(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)); }

export function ArtisanView({ data, loading }: { data: SellerDashboard | null; loading: boolean }) {
  const [appliedPrice, setAppliedPrice] = useState<number>();
  if (!data || loading) return <main className="content"><div className="artisan-hero motion-fade"><div><span className="eyebrow">Artisan intelligence</span><h1 className="section-heading" style={{ marginTop: 14 }}>A clearer next<br /><em>move.</em></h1></div><p className="muted" style={{ maxWidth: 400, lineHeight: 1.55 }}>Loading your production plan and market signals…</p></div></main>;
  const { seller, products, productionPlan, markets, summary } = data;
  const leadProduct = products[0];
  const leadMarket = markets[0];
  const guidance = leadProduct && leadMarket ? getPriceGuidance(leadProduct, leadMarket) : undefined;

  return (
    <main className="content">
      <section className="artisan-hero motion-fade"><div className="seller-identity"><Image src={seller.avatarUrl} alt="" width={54} height={54} /><div><span className="eyebrow">Artisan intelligence</span><h1>{seller.name}</h1><p><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {seller.locationName} · <Star size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {seller.rating.toFixed(1)} rating</p></div></div><div className="notice" style={{ maxWidth: 390 }}><Sparkles size={15} /><span>Signals are directional, explainable, and built from the demo marketplace event history.</span></div></section>

      <section className="metric-grid motion-stagger" aria-label="Artisan metrics"><div className="metric-card" style={{ ['--stagger' as string]: 0 }}><span className="tiny-label">active pieces</span><strong>{summary.activeProducts}</strong><p><Factory /> ready for the next batch</p></div><div className="metric-card" style={{ ['--stagger' as string]: 1 }}><span className="tiny-label">recent impressions</span><strong>{summary.impressions}</strong><p><BarChart3 /> last 30 days</p></div><div className="metric-card" style={{ ['--stagger' as string]: 2 }}><span className="tiny-label">marketplace events</span><strong>{summary.eventCount}</strong><p><TrendingUp /> learning signal</p></div><div className="metric-card" style={{ ['--stagger' as string]: 3 }}><span className="tiny-label">next cutoff</span><strong style={{ fontSize: 23 }}>Fri · 3pm</strong><p><Clock3 /> enough time for plan</p></div></section>

      <section className="seller-dash-grid"><div className="panel panel-pad"><div className="panel-header"><div><p className="panel-kicker">Production plan</p><h2 className="panel-title">Make what can move</h2></div><span className="tiny-label">next 7 days</span></div><div className="plan-list">{productionPlan.map((job, index) => <PlanRow key={job.id} job={job} index={index} products={products} />)}</div></div><div className="panel panel-pad"><div className="panel-header"><div><p className="panel-kicker">Market opportunities</p><h2 className="panel-title">Where demand is leaning</h2></div><ArrowUpRight size={18} color="var(--teal)" /></div><div className="opportunity-list">{markets.slice(0, 4).map((market) => <Opportunity key={market.countryCode} market={market} />)}</div>{guidance ? <div className="price-guidance"><span className="tiny-label">Price guidance · {leadProduct.name}</span><div className="price-range"><strong>{appliedPrice ? `$${appliedPrice.toFixed(2)}` : `$${guidance.low}–$${guidance.high}`}</strong><span>target margin</span></div><p>{guidance.reasons.join(' · ')}.</p><details className="explanation-details explanation-details-dark"><summary>Why this range?</summary><p>It balances the maker’s cost base, observed market opportunity, and the shipping context for a sustainable margin.</p></details><button className="button-secondary button-small pressable" type="button" onClick={() => setAppliedPrice(guidance.midpoint)}>{appliedPrice ? <><Check size={12} /> guidance applied</> : 'Apply midpoint'}</button></div> : null}</div></section>
      <div className="footer-note"><span>Directional intelligence · not a promise of demand</span><span>Built for the artisan behind the object</span></div>
    </main>
  );
}

function PlanRow({ job, index, products: _products }: { job: ProductionJob; index: number; products: Product[] }) {
  return <div className="plan-row" style={{ ['--stagger' as string]: index }}><div><h3>{job.productName}</h3><p>{job.quantity} pieces · {job.processingHours}h making time</p></div><div><span className="tiny-label">start</span><p>{shortDate(job.scheduledStart)}</p></div><div><span className="tiny-label">deadline</span><p>{shortDate(job.deadline)}</p></div><span className={`risk-label ${job.risk}`}>{job.risk.replace('_', ' ')}</span></div>;
}

function Opportunity({ market }: { market: MarketOpportunity }) {
  return <div className="opportunity-row"><div><strong>{market.countryName}</strong><span className="opportunity-score">{market.score}</span></div><p>{market.reasons[0]} · {market.reasons[1]}</p><details className="opportunity-why"><summary>Why this market?</summary><p>{market.reasons.join(' · ')}</p></details></div>;
}
