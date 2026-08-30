'use client';

import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, CircleCheck, CreditCard, Leaf, Minus, Package, Plus, ShieldCheck, Trash2, Waves } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { CoconutMark } from '@/components/coconut-mark';
import type { CartLine, Destination, Product, Quote, Recommendation, Seller } from '@/lib/domain/types';

function money(value: number) { return `$${value.toFixed(2)}`; }
function dateLabel(value: string) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)); }

function CartItem({ product, quantity, onChange, onRemove }: { product: Product; quantity: number; onChange: (quantity: number) => void; onRemove: () => void }) {
  const [removing, setRemoving] = useState(false);
  const removalTimer = useRef<number>();

  function scheduleRemove() {
    setRemoving(true);
    removalTimer.current = window.setTimeout(onRemove, 180);
  }
  function cancelRemove() {
    window.clearTimeout(removalTimer.current);
    setRemoving(false);
  }
  function handleDecrement() {
    if (quantity - 1 <= 0) scheduleRemove(); else onChange(quantity - 1);
  }
  function handleIncrement() {
    if (removing) cancelRemove();
    onChange(Math.min(20, quantity + 1));
  }

  return (
    <article className={`cart-line motion-fade${removing ? ' cart-line-removing' : ''}`}>
      <Image className="cart-line-image" src={product.imageUrl} alt={product.name} width={78} height={78} unoptimized />
      <div>
        <h3>{product.name}</h3>
        <p>{product.category} · {product.weightKg.toFixed(2)} kg each</p>
        <div className="quantity-controls" aria-label={`Quantity for ${product.name}`}>
          <button className="pressable" type="button" onClick={handleDecrement} aria-label="Decrease quantity"><Minus size={12} /></button>
          <span>{String(quantity).padStart(2, '0')}</span>
          <button className="pressable" type="button" onClick={handleIncrement} aria-label="Increase quantity"><Plus size={12} /></button>
        </div>
      </div>
      <div className="line-price"><strong>{money(product.priceUsd * quantity)}</strong><button className="remove-button" type="button" onClick={scheduleRemove}><Trash2 size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> remove</button></div>
    </article>
  );
}

function RecommendationCard({ recommendation, expanded, onToggle, onAdd }: { recommendation: Recommendation; expanded: boolean; onToggle: () => void; onAdd: () => void }) {
  return (
    <article className="recommendation-card">
      <Image className="recommendation-card-image" src={recommendation.product.imageUrl} alt={recommendation.product.name} width={640} height={512} unoptimized />
      <div className="recommendation-card-body">
        <span className="tiny-label">{Math.round(recommendation.score * 100)} signal</span>
        <h3>{recommendation.product.name}</h3>
        <p>{recommendation.shippingDeltaUsd === 0 ? 'Fits the current parcel with no estimated shipping delta.' : `Estimated shipping change: ${money(recommendation.shippingDeltaUsd)}`}</p>
        <div className="recommendation-actions">
          <button className="why-button" type="button" onClick={onToggle}>{expanded ? 'Hide why' : 'Why this?'} {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
          <button className="button-primary button-small pressable" type="button" onClick={onAdd}><Plus size={12} /> add</button>
        </div>
        {expanded ? <div className="why-detail">{recommendation.reasons.map((reason) => <div key={reason}>— {reason}</div>)}</div> : null}
      </div>
    </article>
  );
}

import { RouteJourneyVisualizer } from '@/components/route-journey-visualizer';
import { BatchCoLoadSimulation } from '@/components/batch-co-load-simulation';

export function CartView({ products, sellers: _sellers, quote, recommendations, lines, destination, loading, error, onDestinationChange, onQuantityChange, onRemove, onAdd, onPlaceOrder, onContinueShopping }: { products: Product[]; sellers: Seller[]; quote: Quote | null; recommendations: Recommendation[]; lines: CartLine[]; destination: Destination; loading: boolean; error?: string; onDestinationChange: (destination: Destination) => void; onQuantityChange: (productId: string, quantity: number) => void; onRemove: (productId: string) => void; onAdd: (product: Product) => void; onPlaceOrder: () => void; onContinueShopping: () => void }) {
  const [expandedRecommendation, setExpandedRecommendation] = useState<string>();
  const productMap = new Map(products.map((product) => [product.id, product]));
  const subtotal = quote?.subtotalUsd ?? lines.reduce((sum, line) => sum + (productMap.get(line.productId)?.priceUsd ?? 0) * line.quantity, 0);
  const utilization = quote?.recommendedBatch.utilization ?? 0;

  return (
    <main className="content">
      <div className="cart-page-heading motion-fade">
        <button className="button-secondary button-small pressable cart-continue" type="button" onClick={onContinueShopping}>
          <ArrowLeft size={13} /> Continue browsing
        </button>
        <span className="eyebrow">Your shared journey</span>
        <h1 className="section-heading">A little more room<br /><em>goes a long way.</em></h1>
      </div>

      {/* Interactive Island-to-World Journey Visualizer */}
      <RouteJourneyVisualizer destination={destination} />

      <div className="cart-layout" style={{ paddingTop: 20 }}>
        <section>
          <div className="panel panel-pad">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Basket · {lines.length} {lines.length === 1 ? 'piece' : 'pieces'}</p>
                <h2 className="panel-title">Your island finds</h2>
              </div>
              <Leaf size={20} color="var(--teal)" />
            </div>
            {lines.length ? (
              <div className="cart-lines" style={{ marginTop: 18 }}>
                {lines.map((line) => {
                  const product = productMap.get(line.productId);
                  return product ? (
                    <CartItem
                      key={line.productId}
                      product={product}
                      quantity={line.quantity}
                      onChange={(quantity) => onQuantityChange(line.productId, quantity)}
                      onRemove={() => onRemove(line.productId)}
                    />
                  ) : null;
                })}
              </div>
            ) : (
              <div className="empty-state" style={{ marginTop: 18 }}>
                <span style={{ display: 'block', width: 'fit-content', marginBottom: 13, marginInline: 'auto', color: 'var(--teal)' }}><CoconutMark size={32} /></span>
                <h3>Your parcel is waiting.</h3>
                <p>Head back to the collection and choose a piece to start a shared journey.</p>
              </div>
            )}
            <div className="carton-list">
              <span className="tiny-label" style={{ alignSelf: 'center', marginRight: 3 }}>packing plan</span>
              {quote?.packing.boxes.map((box, index) => (
                <span className="carton-chip" key={`${box.cartonCode}-${index}`}>
                  <Package size={11} style={{ display: 'inline', verticalAlign: '-2px' }} /> {box.cartonCode} · {Math.round(box.utilization * 100)}%
                </span>
              )) ?? <span className="muted" style={{ fontSize: 11 }}>Calculated after you add a piece</span>}
            </div>
          </div>

          {/* 3D / 2.5D Batch Co-Load Simulation preview */}
          {lines.length ? (
            <BatchCoLoadSimulation lines={lines} products={products} quote={quote} />
          ) : null}

          <section className="recommendations">
            <div className="section-topline" style={{ margin: '24px 0 18px' }}>
              <div>
                <span className="eyebrow">Shipping-aware suggestions</span>
                <h2 className="panel-title" style={{ marginTop: 11 }}>Good company for your cart</h2>
              </div>
              <p>Ranked by fit, readiness, margin, and the space already moving with you.</p>
            </div>
            {recommendations.length ? (
              <div className="recommendation-grid motion-stagger">
                {recommendations.slice(0, 3).map((recommendation) => (
                  <RecommendationCard
                    key={recommendation.product.id}
                    recommendation={recommendation}
                    expanded={expandedRecommendation === recommendation.product.id}
                    onToggle={() => setExpandedRecommendation((current) => current === recommendation.product.id ? undefined : recommendation.product.id)}
                    onAdd={() => onAdd(recommendation.product)}
                  />
                ))}
              </div>
            ) : (
              <div className="notice"><Waves size={16} /> Add a piece to unlock recommendations that understand parcel fit.</div>
            )}
          </section>
        </section>

        <aside className="shipping-panel" aria-busy={loading}>
          <div className="shipping-panel-top"><p className="panel-kicker">Coconut shared shipping</p><h2 className="panel-title">Your fairest route</h2><div className="shipping-headline"><div><span className="shipping-label">Shared shipment</span><div className="shipping-price">{quote ? money(quote.shipping.pooledUsd) : '—'}<small>delivery estimate</small></div></div>{quote ? <span className="saving-badge">save {money(quote.shipping.savingsUsd)}</span> : null}</div></div>
          <div className="shipping-details">
            <label className="tiny-label" htmlFor="destination" style={{ color: 'rgba(255,255,255,.55)' }}>Deliver to</label>
            <select id="destination" className="select-field" value={destination.countryCode} onChange={(event) => onDestinationChange({ ...destination, countryCode: event.target.value as Destination['countryCode'] })}>
              <option value="US">United States · 94107</option><option value="AU">Australia · 2000</option><option value="NZ">New Zealand · 1010</option><option value="JP">Japan · 100-0001</option><option value="CA">Canada · V6B 1A1</option>
            </select>
            {loading ? <div className="quote-status" role="status" aria-live="polite">Refreshing your shared quote…</div> : null}
            {error ? <div className="quote-error" role="alert">{error}</div> : null}
            {quote ? <>
              <div className="shipping-divider" />
              <div className="detail-row"><span>Solo estimate</span><strong>{money(quote.shipping.estimatedSoloUsd)}</strong></div>
              <div className="detail-row"><span>Island pickup share</span><strong>{money(quote.breakdown.localPickupShareUsd)}</strong></div>
              <div className="detail-row"><span>Final mile · {quote.finalMile.carrier}</span><strong>{money(quote.breakdown.finalMileUsd)}</strong></div>
              <div className="detail-row"><span>Packaging · {quote.packing.boxes.length} carton{quote.packing.boxes.length === 1 ? '' : 's'}</span><strong>{money(quote.breakdown.packagingUsd)}</strong></div>
              <div className="shipping-divider" />
              <div><div className="progress-caption"><span>Shared shipment · Friday</span><strong>{Math.round(utilization * 100)}% utilized</strong></div><div className="progress-track" aria-label={`${Math.round(utilization * 100)} percent of shared shipment utilized`}><div className="progress-fill" style={{ ['--progress' as string]: utilization }} /></div></div>
              <div className="ship-footer"><span>Arrives<br /><strong>{dateLabel(quote.estimatedDelivery.minDate)} – {dateLabel(quote.estimatedDelivery.maxDate)}</strong></span><span style={{ textAlign: 'right' }}>Sea state<br /><strong style={{ color: '#8bd7d4' }}><span className="status-dot" />{quote.recommendedBatch.weatherLabel.toLowerCase()}</strong></span></div>
              <button className="button-primary pressable" type="button" onClick={onPlaceOrder} disabled={loading}>{loading ? 'Confirming…' : <>Place demo order <ArrowRight size={14} /></>}</button>
            </> : <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, lineHeight: 1.5, paddingTop: 10 }}>Your route, packing plan, and shared savings will appear here.</div>}
            <div className="detail-row" style={{ justifyContent: 'flex-start', gap: 7, marginTop: 4 }}><ShieldCheck size={13} color="#8bd7d4" /><span>Demo quote · no payment captured</span></div>
          </div>
        </aside>
      </div>
      <div className="footer-note"><span><CreditCard size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> No account required for the demo</span><span>subtotal {money(subtotal)} · shipping responds to each piece</span></div>
    </main>
  );
}
