'use client';

import { Check, CircleHelp, Monitor, Moon, ShoppingBag, Sun, Waves, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AccountDialog } from '@/components/account-dialog';
import { ArtisanView } from '@/components/artisan-view';
import { CartView } from '@/components/cart-view';
import { OperationsView, type OperationsData } from '@/components/operations-view';
import { ProductView } from '@/components/product-view';
import { ShopView } from '@/components/shop-view';
import { SiteFooter } from '@/components/site-footer';
import { getCurrentAccount, loadSavedCart, saveCart, signOut, type CoconutAccount, type SellerListing } from '@/lib/account';
import { createDemoOrder, getCartRecommendations, getCartQuote, getClientBackendMode, getMarketplaceData, getOperations, getSellerDashboard, optimizeOperations, recordMarketplaceEvent, resetDemo } from '@/lib/client-gateway';
import type { CartLine, Destination, Product, Quote, Recommendation } from '@/lib/domain/types';

export type AppView = 'shop' | 'cart' | 'operations' | 'artisan';
type ThemeMode = 'system' | 'light' | 'dark';

const defaultDestination: Destination = { countryCode: 'US', region: 'West Coast', postalCode: '94107' };

function mergeCartLines(...groups: (CartLine[] | undefined)[]): CartLine[] {
  const merged = new Map<string, number>();
  for (const group of groups) for (const line of group ?? []) merged.set(line.productId, Math.min(20, (merged.get(line.productId) ?? 0) + line.quantity));
  return Array.from(merged, ([productId, quantity]) => ({ productId, quantity }));
}

function accountInitials(account: CoconutAccount) {
  return account.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

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
  const navRef = useRef<HTMLElement>(null);
  const activeNavButtonRef = useRef<HTMLButtonElement | null>(null);
  const [navIndicator, setNavIndicator] = useState<{ x: number; width: number }>({ x: 0, width: 0 });
  const [account, setAccount] = useState<CoconutAccount | null>(null);
  const [accountReady, setAccountReady] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem('coconut-theme');
      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
    } catch {
      // The system theme remains the safe fallback when local storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    let savedTheme: string | null = null;
    try { savedTheme = window.localStorage.getItem('coconut-theme'); } catch { /* system preference remains active */ }
    if (theme === 'system') {
      if (savedTheme !== 'light' && savedTheme !== 'dark') root.removeAttribute('data-theme');
      return;
    }
    root.dataset.theme = theme;
    try { window.localStorage.setItem('coconut-theme', theme); } catch { /* keep the current session theme */ }
  }, [theme]);

  useEffect(() => {
    let active = true;
    getMarketplaceData().then((result) => { if (active) setData(result); });
    return () => { active = false; };
  }, []);

  useLayoutEffect(() => {
    function measure() {
      const nav = navRef.current;
      const button = activeNavButtonRef.current;
      if (!nav || !button) return;
      const navRect = nav.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      setNavIndicator({ x: buttonRect.left - navRect.left, width: buttonRect.width });
    }
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [view, showProduct]);

  useEffect(() => {
    let active = true;
    getCurrentAccount().then(async (current) => {
      if (!active) return;
      setAccount(current);
      const saved = await loadSavedCart(current?.id);
      if (active && saved) setLines(saved);
      if (active) setAccountReady(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (accountReady) void saveCart(account?.id, lines);
  }, [account?.id, accountReady, lines]);

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
  const backendMode = getClientBackendMode();

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(undefined), 2800);
  }

  function navigate(nextView: AppView) {
    setShowProduct(false);
    setView(nextView);
    if (nextView === 'operations' && !operations) setLoadingOperations(true);
  }

  async function handleAuthenticated(nextAccount: CoconutAccount) {
    const [guestCart, accountCart] = await Promise.all([loadSavedCart(), loadSavedCart(nextAccount.id)]);
    setAccount(nextAccount);
    setLines(mergeCartLines(guestCart, accountCart, lines));
    setAccountReady(true);
    setAccountDialogOpen(false);
    notify(nextAccount.source === 'appwrite' ? 'Your Coconut workspace is ready.' : 'Demo account ready — your workspace is saved in this browser.');
  }

  async function handleSignOut() {
    await saveCart(undefined, lines);
    await signOut();
    setAccount(null);
    notify('Signed out. Your guest cart is still here.');
  }

  function handleListingCreated(listing: SellerListing) {
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        sellers: current.sellers.some((seller) => seller.id === listing.seller.id) ? current.sellers : [...current.sellers, listing.seller],
        products: current.products.some((product) => product.id === listing.product.id) ? current.products : [listing.product, ...current.products],
      };
    });
    notify(`${listing.product.name} is ready in your collection.`);
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

  function resetDemoState() {
    setLines([{ productId: 'product-001', quantity: 1 }]);
    setDestination(defaultDestination);
    setQuote(null);
    setRecommendations([]);
    setOperations(null);
    setSellerDashboard(undefined);
    setLoadingQuote(false);
    setLoadingOperations(false);
    setLoadingSeller(false);
    setQuoteError(undefined);
    setOrder(undefined);
    setShowProduct(false);
    setView('shop');
    notify('Canonical demo state restored.');
    void resetDemo();
  }

  async function placeOrder() {
    if (!quote || !lines.length) return;
    const result = await createDemoOrder({ lines, subtotalUsd: quote.subtotalUsd, pooledShippingUsd: quote.shipping.pooledUsd, destinationCountry: destination.countryCode });
    setOrder(result);
    void recordMarketplaceEvent({ sessionId: 'demo-session', eventType: 'purchase', metadata: result });
  }

  const appContent = showProduct && initialProductSlug && selectedProduct ? <ProductView product={selectedProduct} added={lines.some((line) => line.productId === selectedProduct.id)} onAdd={() => addToCart(selectedProduct)} onOpenCart={() => navigate('cart')} onBack={() => navigate('shop')} /> : view === 'shop' ? <ShopView products={data?.products ?? []} sellers={data?.sellers ?? []} departures={data?.departures ?? []} batch={data?.batch ?? { id: '', departureId: '', destinationZone: '', currentWeightKg: 0, currentVolumeM3: 0, orderCount: 0, participatingSellerIds: [], weatherRisk: 0, weatherLabel: 'loading', estimatedLocalPickupCostUsd: 0, predictedTotalLogisticsCostUsd: 0 }} cartLines={lines} onAdd={addToCart} onOpenCart={() => navigate('cart')} /> : view === 'cart' ? <CartView products={data?.products ?? []} sellers={data?.sellers ?? []} quote={quote} recommendations={recommendations} lines={lines} destination={destination} loading={loadingQuote} error={quoteError} onDestinationChange={setDestination} onQuantityChange={changeQuantity} onRemove={(productId) => changeQuantity(productId, 0)} onAdd={addToCart} onPlaceOrder={placeOrder} onContinueShopping={() => navigate('shop')} /> : view === 'operations' ? <OperationsView data={operations} loading={loadingOperations && !operations} optimizing={loadingOperations} onOptimize={optimize} /> : <ArtisanView data={sellerDashboard ?? null} loading={loadingSeller} account={account} onRequireAccount={() => setAccountDialogOpen(true)} onCreated={handleListingCreated} />;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <div className="topbar-wrapper">
      <header className="topbar">
        <div className="brand-island">
          <button className="brand pressable" type="button" onClick={() => navigate('shop')} aria-label="Coconut home">
            <span className="brand-mark" aria-hidden="true"><CoconutMark /></span>
            <span>
              <span className="brand-name">Coconut</span>
              <span className="brand-note">Island-made logistics</span>
            </span>
          </button>
        </div>

        <div className="main-nav-island">
          <nav className="main-nav" aria-label="Primary navigation" ref={navRef}>
            <span className="nav-indicator" aria-hidden="true" style={{ transform: `translateX(${navIndicator.x}px)`, width: navIndicator.width }} />
            <button ref={(el) => { if (view === 'shop' && !showProduct) activeNavButtonRef.current = el; }} className={`nav-button ${view === 'shop' && !showProduct ? 'active' : ''}`} type="button" aria-current={view === 'shop' && !showProduct ? 'page' : undefined} onClick={() => navigate('shop')}>Shop</button>
            <button ref={(el) => { if (view === 'cart') activeNavButtonRef.current = el; }} className={`nav-button ${view === 'cart' ? 'active' : ''}`} type="button" aria-current={view === 'cart' ? 'page' : undefined} onClick={() => navigate('cart')}>Cart</button>
            <button ref={(el) => { if (view === 'operations') activeNavButtonRef.current = el; }} className={`nav-button ${view === 'operations' ? 'active' : ''}`} type="button" aria-current={view === 'operations' ? 'page' : undefined} onClick={() => navigate('operations')}>Operations</button>
            <button ref={(el) => { if (view === 'artisan') activeNavButtonRef.current = el; }} className={`nav-button ${view === 'artisan' ? 'active' : ''}`} type="button" aria-current={view === 'artisan' ? 'page' : undefined} onClick={() => navigate('artisan')}>Artisan</button>
          </nav>
        </div>

        <div className="topbar-actions-island">
          {account ? (
            <button className="account-trigger pressable" type="button" onClick={() => void handleSignOut()} aria-label={`Sign out ${account.name}`}>
              <span className="account-avatar" aria-hidden="true">{accountInitials(account)}</span>
              <span className="account-name">{account.name}</span>
            </button>
          ) : (
            <button className="account-trigger pressable" type="button" onClick={() => setAccountDialogOpen(true)}>Sign in</button>
          )}
          <div className="theme-control" role="group" aria-label="Color theme">
            <button className={`theme-button ${theme === 'system' ? 'active' : ''}`} type="button" aria-label="Use system color theme" aria-pressed={theme === 'system'} onClick={() => setTheme('system')} title="System theme"><Monitor size={14} /></button>
            <button className={`theme-button ${theme === 'light' ? 'active' : ''}`} type="button" aria-label="Use light color theme" aria-pressed={theme === 'light'} onClick={() => setTheme('light')} title="Light theme"><Sun size={14} /></button>
            <button className={`theme-button ${theme === 'dark' ? 'active' : ''}`} type="button" aria-label="Use dark color theme" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')} title="Dark theme"><Moon size={14} /></button>
          </div>
          <button id="cart-nav-button" className="cart-trigger pressable" type="button" onClick={() => navigate('cart')} aria-label={`Open cart with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}>
            <ShoppingBag size={15} />
            <span className="cart-count" key={cartCount} aria-hidden="true">{cartCount}</span>
          </button>
        </div>
      </header>
    </div>
    <div id="main-content" tabIndex={-1}>{appContent}</div>
    <SiteFooter onJoin={() => setAccountDialogOpen(true)} />
    <div className="network-status"><span className="status-dot" /> {backendMode === 'appwrite-configured' ? 'Appwrite ready' : 'Demo fallback'} <CircleHelp size={12} aria-label={backendMode === 'appwrite-configured' ? 'Appwrite API configured; provider fallbacks remain available' : 'Appwrite API not configured; deterministic seeded data is active'} /><button className="network-reset" type="button" onClick={resetDemoState}>Reset demo</button></div>
    {toast ? <div className="toast" role="status" aria-live="polite"><Check size={15} color="#8bd7d4" /> {toast}</div> : null}
    {order ? <div className="overlay" role="presentation"><section className="confirmation" role="dialog" aria-modal="true" aria-labelledby="order-title"><button className="icon-close pressable" type="button" onClick={() => setOrder(undefined)} aria-label="Close order confirmation"><X size={16} /></button><div className="confirmation-mark"><Check size={21} /></div><h2 id="order-title">Shared parcel booked.</h2><p>Demo order <span className="mono">{order.orderId}</span> is attached to the Friday West Coast Batch. No payment was captured.</p><button className="button-primary pressable" type="button" onClick={() => { setOrder(undefined); navigate('shop'); }}>Back to the island <Waves size={14} /></button></section></div> : null}
    {accountDialogOpen ? <AccountDialog onClose={() => setAccountDialogOpen(false)} onAuthenticated={handleAuthenticated} /> : null}
  </div>;
}

function CoconutMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="10" r="1.3" fill="currentColor" />
      <circle cx="14.4" cy="8.6" r="1.3" fill="currentColor" />
      <path d="M4.5 13.4c2.6 2.3 5.7 3 8.8 2.2 3.1-.8 5.6-2.9 7-5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}
