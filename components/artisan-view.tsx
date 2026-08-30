'use client';

import { ArrowUpRight, BarChart3, Check, Clock3, Factory, Info, MapPin, Star, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';
import { SellerStudio } from '@/components/seller-studio';
import type { CoconutAccount, SellerListing } from '@/lib/account';
import type { MarketOpportunity, Product, ProductionJob } from '@/lib/domain/types';
import type { SellerDashboard } from '@/lib/client-gateway';
import { getPriceGuidance } from '@/lib/engines/market-opportunity';
import { useReveal } from '@/components/use-reveal';
import { useCountUp } from '@/components/use-count-up';

function shortDate(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)); }

export function ArtisanView({ data, loading: _loading, account, onRequireAccount, onCreated }: { data: SellerDashboard | null; loading: boolean; account: CoconutAccount | null; onRequireAccount: () => void; onCreated: (listing: SellerListing) => void }) {
  const [appliedPrice, setAppliedPrice] = useState<number>();
  const dashReveal = useReveal<HTMLElement>();
  const activeProductsCount = useCountUp(data?.summary.activeProducts ?? 0);
  const impressionsCount = useCountUp(data?.summary.impressions ?? 0);
  const eventCount = useCountUp(data?.summary.eventCount ?? 0);
  if (!data) return <main className="content"><div className="artisan-hero motion-fade"><div><span className="eyebrow">Maker workspace</span><h1 className="section-heading" style={{ marginTop: 14 }}>A clearer next<br /><em>move.</em></h1></div><p className="muted" style={{ maxWidth: 400, lineHeight: 1.55 }}>Loading your production plan and market notes…</p></div><div className="metric-grid" aria-hidden="true">{[0, 1, 2, 3].map((index) => <div className="metric-card skeleton" key={index}>placeholder</div>)}</div><div className="panel skeleton" style={{ minHeight: 280, marginTop: 18 }}>placeholder</div></main>;
  const { seller, products, productionPlan, markets, summary } = data;
  const leadProduct = products[0];
  const leadMarket = markets[0];
  const guidance = leadProduct && leadMarket ? getPriceGuidance(leadProduct, leadMarket) : undefined;

  return (
    <main className="content">
      <section className="artisan-hero motion-fade"><div className="seller-identity"><Image src={seller.avatarUrl} alt="" width={54} height={54} unoptimized /><div><span className="eyebrow">Maker workspace</span><h1>{seller.name}</h1><p><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {seller.locationName} · <Star size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> {seller.rating.toFixed(1)} rating</p></div></div><div className="notice" style={{ maxWidth: 390 }}><Info size={15} /><span>Market notes are directional and explainable, based on the demo marketplace event history.</span></div></section>

        <section className="metric-grid motion-stagger" aria-label="Maker metrics"><div className="metric-card" style={{ ['--stagger' as string]: 0 }}><span className="tiny-label">Active pieces</span><strong>{activeProductsCount}</strong><p><Factory /> Ready for the next batch</p></div><div className="metric-card" style={{ ['--stagger' as string]: 1 }}><span className="tiny-label">Recent impressions</span><strong>{impressionsCount}</strong><p><BarChart3 /> Last 30 days</p></div><div className="metric-card" style={{ ['--stagger' as string]: 2 }}><span className="tiny-label">Marketplace events</span><strong>{eventCount}</strong><p><TrendingUp /> Recent activity</p></div><div className="metric-card" style={{ ['--stagger' as string]: 3 }}><span className="tiny-label">Next cutoff</span><strong style={{ fontSize: 23 }}>Fri · 3pm</strong><p><Clock3 /> Enough time for plan</p></div></section>

      <section ref={dashReveal.ref} className={`seller-dash-grid ${dashReveal.className}`}><div className="panel panel-pad"><div className="panel-header"><div><p className="panel-kicker">Production plan</p><h2 className="panel-title">Make what can move</h2></div><span className="tiny-label">next 7 days</span></div><div className="plan-list">{productionPlan.map((job, index) => <PlanRow key={job.id} job={job} index={index} products={products} />)}</div></div><div className="panel panel-pad"><div className="panel-header"><div><p className="panel-kicker">Market opportunities</p><h2 className="panel-title">Where demand is leaning</h2></div><ArrowUpRight size={18} color="var(--teal)" /></div><div className="opportunity-list">{markets.slice(0, 4).map((market) => <Opportunity key={market.countryCode} market={market} />)}</div>{guidance ? <div className="price-guidance"><span className="tiny-label">Price guidance · {leadProduct.name}</span><div className="price-range"><strong>{appliedPrice ? `$${appliedPrice.toFixed(2)}` : `$${guidance.low}–$${guidance.high}`}</strong><span>target margin</span></div><p>{guidance.reasons.join(' · ')}.</p><details className="explanation-details explanation-details-dark"><summary>Why this range?</summary><p>It balances the maker’s cost base, observed market opportunity, and the shipping context for a sustainable margin.</p></details><button className="button-secondary button-small pressable" type="button" onClick={() => setAppliedPrice(guidance.midpoint)}>{appliedPrice ? <><Check size={12} /> guidance applied</> : 'Apply midpoint'}</button></div> : null}</div></section>
      <SellerStudio account={account} onRequireAccount={onRequireAccount} onCreated={onCreated} />
      <div className="footer-note"><span>Planning notes · not a promise of demand</span><span>Built for the maker behind the object</span></div>
    </main>
  );
}

function PlanRow({ job, index, products: _products }: { job: ProductionJob; index: number; products: Product[] }) {
  return <div className="plan-row" style={{ ['--stagger' as string]: index }}><div><h3>{job.productName}</h3><p>{job.quantity} pieces · {job.processingHours}h making time</p></div><div><span className="tiny-label">Start</span><p>{shortDate(job.scheduledStart)}</p></div><div><span className="tiny-label">Deadline</span><p>{shortDate(job.deadline)}</p></div><span className={`risk-label ${job.risk}`}>{job.risk.replace('_', ' ').replace(/^\w/, (character) => character.toUpperCase())}</span></div>;
}

function Opportunity({ market }: { market: MarketOpportunity }) {
  return <div className="opportunity-row"><div><strong>{market.countryName}</strong><span className="opportunity-score">{market.score}</span></div><p>{market.reasons[0]} · {market.reasons[1]}</p><details className="opportunity-why"><summary>Why this market?</summary><p>{market.reasons.join(' · ')}</p></details></div>;
}
