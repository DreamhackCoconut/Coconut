'use client';

import { Check, CircleHelp, ShoppingBag, Waves, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ArtisanView } from '@/components/artisan-view';
import { CartView } from '@/components/cart-view';
import { OperationsView, type OperationsData } from '@/components/operations-view';
import { ProductView } from '@/components/product-view';
import { ShopView } from '@/components/shop-view';
import { createDemoOrder, getCartRecommendations, getCartQuote, getMarketplaceData, getOperations, getSellerDashboard, optimizeOperations, recordMarketplaceEvent, resetDemo } from '@/lib/client-gateway';
import type { CartLine, Destination, Product, Quote, Recommendation } from '@/lib/domain/types';

export type AppView = 'shop' | 'cart' | 'operations' | 'artisan';

const defaultDestination: Destination = { countryCode: 'US', region: 'West Coast', postalCode: '94107' };

export function CoconutApp({ initialView = 'shop', initialProductSlug }: { initialView?: AppView; initialProductSlug?: string }) {
  const [view, setView] = useState<AppView>(initialProductSlug ? 'shop' : initialView);
  const [showProduct, setShowProduct] = useState(Boolean(initialProductSlug));
  const [data, setData] = useState<Awaited<ReturnType<typeof getMarketplaceData>>>();
  const [lines, setLines] = useState<CartLine[]>([{ productId: 'product-001', quantity: 1 }]);
  const [destination, setDestination] = useState<Destination>(defaultDestination);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [operations, setOperations] = useState<OperationsData | null>(null);
  const [sellerDashboard, setSellerDashboard] = useState<Awaited<ReturnType<typeof getSellerDashboard>>>();
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingOperations, setLoadingOperations] = useState(false);
  const [loadingSeller, setLoadingSeller] = useState(false);
  const [quoteError, setQuoteError] = useState<string>();
  const [order, setOrder] = useState<{ orderId: string; batchId: string }>();
  const [toast, setToast] = useState<string>();

  useEffect(() => {
    let active = true;
    getMarketplaceData().then((result) => { if (active) setData(result); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!data || !lines.length) { setQuote(null); setRecommendations([]); setQuoteError(undefined); return undefined; }
    let active = true;
    setLoadingQuote(true);
    setQuoteError(undefined);
    Promise.all([getCartQuote(lines, destination), getCartRecommendations(lines, destination)]).then(([nextQuote, nextRecommendations]) => {
      if (!active) return;
      setQuote(nextQuote);
      setRecommendations(nextRecommendations);
      setLoadingQuote(false);
    }).catch(() => { if (!active) return; setQuoteError('The shared quote could not refresh. Please try again.'); setLoadingQuote(false); });
    return () => { active = false; };
  }, [data, destination, lines]);

  useEffect(() => {
    if (view !== 'operations' || operations) return undefined;
    let active = true;
    setLoadingOperations(true);
    getOperations().then((result) => { if (active) setOperations(result as unknown as OperationsData); }).finally(() => { if (active) setLoadingOperations(false); });
    return () => { active = false; };
  }, [operations, view]);

  useEffect(() => {
    if (view !== 'artisan' || sellerDashboard !== undefined) return undefined;
    const sellerId = data?.sellers[0]?.id ?? 'seller-01';
    let active = true;
    setLoadingSeller(true);
    getSellerDashboard(sellerId).then((result) => { if (active) setSellerDashboard(result); }).finally(() => { if (active) setLoadingSeller(false); });
    return () => { active = false; };
  }, [data, sellerDashboard, view]);

  const selectedProduct = useMemo(() => data?.products.find((product) => product.slug === initialProductSlug), [data, initialProductSlug]);
  const cartCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 2800);
  }

  function navigate(nextView: AppView) {
    setShowProduct(false);
    setView(nextView);
    if (nextView === 'operations' && !operations) setLoadingOperations(true);
  }

  function addToCart(product: Product) {
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);
      return existing ? current.map((line) => line.productId === product.id ? { ...line, quantity: Math.min(20, line.quantity + 1) } : line) : [...current, { productId: product.id, quantity: 1 }];
    });
    void recordMarketplaceEvent({ sessionId: 'demo-session', eventType: 'add_to_cart', productId: product.id, sellerId: product.sellerId });
    notify(`${product.name} joined the shared parcel.`);
  }

  function changeQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => line.productId !== productId));
      void recordMarketplaceEvent({ sessionId: 'demo-session', eventType: 'remove_from_cart', productId });
      return;
    }
    setLines((current) => current.map((line) => line.productId === productId ? { ...line, quantity } : line));
  }

  async function optimize() {
    setLoadingOperations(true);
    const result = await optimizeOperations();
    setOperations(result as unknown as OperationsData);
    setLoadingOperations(false);
    notify('Route refreshed with capacity and pickup windows in mind.');
  }

  async function resetDemoState() {
    await resetDemo();
    setLines([{ productId: 'product-001', quantity: 1 }]);
    setDestination(defaultDestination);
    setQuote(null);
    setRecommendations([]);
    setOperations(null);
    setSellerDashboard(undefined);
    setOrder(undefined);
    setShowProduct(false);
    setView('shop');
    notify('Canonical demo state restored.');
  }

  async function placeOrder() {
    if (!quote || !lines.length) return;
    const result = await createDemoOrder({ lines, subtotalUsd: quote.subtotalUsd, pooledShippingUsd: quote.shipping.pooledUsd, destinationCountry: destination.countryCode });
    setOrder(result);
    void recordMarketplaceEvent({ sessionId: 'demo-session', eventType: 'purchase', metadata: result });
  }

  const appContent = showProduct && initialProductSlug && selectedProduct ? <ProductView product={selectedProduct} onAdd={() => addToCart(selectedProduct)} onBack={() => navigate('shop')} /> : view === 'shop' ? <ShopView products={data?.products ?? []} sellers={data?.sellers ?? []} departures={data?.departures ?? []} batch={data?.batch ?? { id: '', departureId: '', destinationZone: '', currentWeightKg: 0, currentVolumeM3: 0, orderCount: 0, participatingSellerIds: [], weatherRisk: 0, weatherLabel: 'loading', estimatedLocalPickupCostUsd: 0, predictedTotalLogisticsCostUsd: 0 }} cartLines={lines} onAdd={addToCart} onOpenCart={() => navigate('cart')} /> : view === 'cart' ? <CartView products={data?.products ?? []} sellers={data?.sellers ?? []} quote={quote} recommendations={recommendations} lines={lines} destination={destination} loading={loadingQuote} error={quoteError} onDestinationChange={setDestination} onQuantityChange={changeQuantity} onRemove={(productId) => changeQuantity(productId, 0)} onAdd={addToCart} onPlaceOrder={placeOrder} /> : view === 'operations' ? <OperationsView data={operations} loading={loadingOperations && !operations} optimizing={loadingOperations} onOptimize={optimize} /> : <ArtisanView data={sellerDashboard ?? null} loading={loadingSeller} />;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="topbar">
      <button className="brand pressable" type="button" onClick={() => navigate('shop')} aria-label="Coconut home">
        <span className="brand-mark" aria-hidden="true"><Waves size={17} /></span><span><span className="brand-name">Coconut</span><span className="brand-note">island-made logistics</span></span>
      </button>
      <nav className="main-nav" aria-label="Primary navigation">
        <button className={`nav-button ${view === 'shop' && !showProduct ? 'active' : ''}`} type="button" aria-current={view === 'shop' && !showProduct ? 'page' : undefined} onClick={() => navigate('shop')}>Shop</button>
        <button className={`nav-button ${view === 'cart' ? 'active' : ''}`} type="button" aria-current={view === 'cart' ? 'page' : undefined} onClick={() => navigate('cart')}>Cart</button>
        <button className={`nav-button ${view === 'operations' ? 'active' : ''}`} type="button" aria-current={view === 'operations' ? 'page' : undefined} onClick={() => navigate('operations')}>Operations</button>
        <button className={`nav-button ${view === 'artisan' ? 'active' : ''}`} type="button" aria-current={view === 'artisan' ? 'page' : undefined} onClick={() => navigate('artisan')}>Artisan</button>
      </nav>
      <button className="cart-trigger pressable" type="button" onClick={() => navigate('cart')} aria-label={`Open cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}><ShoppingBag size={17} /><span className="cart-count" aria-hidden="true">{cartCount}</span></button>
    </header>
    <div id="main-content" tabIndex={-1}>{appContent}</div>
    <div className="network-status"><span className="status-dot" /> demo-ready <CircleHelp size={12} aria-label="Demo mode uses deterministic seeded data" /><button className="network-reset" type="button" onClick={() => void resetDemoState}>Reset demo</button></div>
    {toast ? <div className="toast" role="status" aria-live="polite"><Check size={15} color="#8bd7d4" /> {toast}</div> : null}
    {order ? <div className="overlay" role="presentation"><section className="confirmation" role="dialog" aria-modal="true" aria-labelledby="order-title"><button className="icon-close pressable" type="button" onClick={() => setOrder(undefined)} aria-label="Close order confirmation"><X size={16} /></button><div className="confirmation-mark"><Check size={21} /></div><h2 id="order-title">Shared parcel booked.</h2><p>Demo order <span className="mono">{order.orderId}</span> is attached to the Friday West Coast Batch. No payment was captured.</p><button className="button-primary pressable" type="button" onClick={() => { setOrder(undefined); navigate('shop'); }}>Back to the island <Waves size={14} /></button></section></div> : null}
  </div>;
}
