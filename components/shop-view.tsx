'use client';

import { ArrowRight, Box, Check, CircleCheck, Clock, Eye, Feather, Hammer, MapPin, Package, PackageCheck, Plus, Radio, Route as RouteIcon, Search, ShipWheel, UsersRound } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BatchSnapshot, CartLine, Departure, Product, ProductCategory, Seller } from '@/lib/domain/types';
import { useReveal } from '@/components/use-reveal';
import { useCountUp } from '@/components/use-count-up';
import { ProductModal } from '@/components/product-modal';

const categories: Array<'All' | ProductCategory> = ['All', 'Basketry', 'Jewelry', 'Woodwork', 'Textiles', 'Ceramics', 'Prints'];

function formatCountdown(targetIsoDate?: string) {
  if (!targetIsoDate) return '2d 14h 22m';
  const diff = new Date(targetIsoDate).getTime() - Date.now();
  if (diff <= 0) return 'Cutoff imminent';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function ProductCard({
  product,
  seller,
  index,
  added,
  onAdd,
  onQuickView,
}: {
  product: Product;
  seller?: Seller;
  index: number;
  added: boolean;
  onAdd: (product: Product, e?: React.MouseEvent) => void;
  onQuickView: (product: Product) => void;
}) {
  return (
    <article className="product-card" style={{ ['--stagger' as string]: index }}>
      <button
        className="product-card-main"
        type="button"
        onClick={() => onQuickView(product)}
        aria-label={`View details for ${product.name}`}
      >
        <div className="product-image">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 560px) 50vw, (max-width: 1080px) 33vw, 25vw"
            priority={index < 4}
            unoptimized
          />
          <span className="product-tag">{product.category}</span>
        </div>

        <div className="product-card-body">
          <div>
            <div className="seller-line">
              {seller ? <Image className="seller-avatar" src={seller.avatarUrl} alt="" width={18} height={18} unoptimized /> : null}
              <span>{seller?.name ?? 'Island artisan'}</span>
            </div>
            <h3>{product.name}</h3>
            <p>{product.description}</p>

            <div className="product-sub-info">
              <span className="material-line">{product.materials[0] || 'Handcrafted'}</span>
              <span className="weight-fit-line">· {product.weightKg} kg</span>
            </div>
          </div>
        </div>
      </button>

      <div className="product-meta">
        <span className="price">${product.priceUsd}</span>
        <button
          className="add-icon pressable"
          type="button"
          onClick={(e) => onAdd(product, e)}
          aria-label={`Add ${product.name} to cart`}
          title={added ? 'Add another' : 'Add to cart'}
        >
          {added ? <Check size={16} strokeWidth={2.4} /> : <Plus size={16} strokeWidth={2.4} />}
        </button>
      </div>
    </article>
  );
}

export function ShopView({ products, sellers, departures, batch, cartLines, onAdd, onOpenCart }: { products: Product[]; sellers: Seller[]; departures: Departure[]; batch: BatchSnapshot; cartLines: CartLine[]; onAdd: (product: Product) => void; onOpenCart: () => void }) {
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [search, setSearch] = useState('');
  const [activeArtisanIndex, setActiveArtisanIndex] = useState(0);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; destX: number; destY: number }>>([]);
  
  const filterNavRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const [filterIndicator, setFilterIndicator] = useState<{ x: number; width: number }>({ x: 0, width: 0 });

  const howReveal = useReveal<HTMLElement>();
  const collectionReveal = useReveal<HTMLElement>();
  
  const selectedDeparture = departures.find((departure) => departure.id === batch.departureId) ?? departures[1] ?? departures[0];
  const weightUtilization = selectedDeparture ? Math.min(1, batch.currentWeightKg / selectedDeparture.maxWeightKg) : 0;
  const volumeUtilization = selectedDeparture ? Math.min(1, batch.currentVolumeM3 / selectedDeparture.maxVolumeM3) : 0;
  
  const weightPercent = useCountUp(Math.round(weightUtilization * 100));
  const volumePercent = useCountUp(Math.round(volumeUtilization * 100));
  const orderCount = useCountUp(batch.orderCount);
  const sellerCount = useCountUp(sellers.length);
  const sellerMap = useMemo(() => new Map(sellers.map((seller) => [seller.id, seller])), [sellers]);

  // Smooth category tab indicator measurement
  useLayoutEffect(() => {
    function measureFilter() {
      const container = filterNavRef.current;
      const tab = activeTabRef.current;
      if (!container || !tab) return;
      const containerRect = container.getBoundingClientRect();
      const tabRect = tab.getBoundingClientRect();
      setFilterIndicator({ x: tabRect.left - containerRect.left, width: tabRect.width });
    }
    measureFilter();
    window.addEventListener('resize', measureFilter);
    return () => window.removeEventListener('resize', measureFilter);
  }, [category]);

  // Handle add to cart with particle animation to top cart button
  function handleAddWithParticle(product: Product, event?: React.MouseEvent) {
    onAdd(product);
    if (event && typeof window !== 'undefined') {
      const cartBtn = document.getElementById('cart-nav-button');
      const startX = event.clientX;
      const startY = event.clientY;
      if (cartBtn) {
        const cartRect = cartBtn.getBoundingClientRect();
        const destX = cartRect.left + cartRect.width / 2 - startX;
        const destY = cartRect.top + cartRect.height / 2 - startY;
        const particleId = Date.now();
        setParticles((prev) => [...prev, { id: particleId, x: startX, y: startY, destX, destY }]);
        setTimeout(() => {
          setParticles((prev) => prev.filter((p) => p.id !== particleId));
        }, 650);
      }
    }
  }

  // Rotate spotlighted artisan smoothly every 6 seconds
  useEffect(() => {
    if (!sellers.length) return;
    const interval = setInterval(() => {
      setActiveArtisanIndex((prev) => (prev + 1) % sellers.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sellers.length]);

  const spotlightedSeller = sellers[activeArtisanIndex] ?? sellers[0];

  // Dynamic countdown timer string
  const [countdownText, setCountdownText] = useState(() => formatCountdown(selectedDeparture?.cutoffAt));
  useEffect(() => {
    if (!selectedDeparture?.cutoffAt) return;
    const timer = setInterval(() => {
      setCountdownText(formatCountdown(selectedDeparture.cutoffAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedDeparture?.cutoffAt]);

  const visibleProducts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === 'All' || product.category === category;
      const haystack = [product.name, product.description, product.category, ...product.tags, ...product.materials].join(' ').toLowerCase();
      return matchesCategory && (!needle || haystack.includes(needle));
    }).slice(0, 12);
  }, [category, products, search]);
  const cartIds = new Set(cartLines.map((line) => line.productId));

  return (
    <main className="content">
      {/* Floating Particles for Add-to-cart */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="cart-particle"
          style={{
            left: p.x,
            top: p.y,
            ['--dest-x' as string]: `${p.destX}px`,
            ['--dest-y' as string]: `${p.destY}px`,
          }}
          aria-hidden="true"
        />
      ))}

      <section className="hero-grid motion-fade">
        <div className="hero-copy">
          {/* Flat Minimalist Artisan Micro-Spotlight */}
          {spotlightedSeller ? (
            <div className="artisan-spotlight" key={spotlightedSeller.id}>
              <Image className="artisan-spotlight-avatar" src={spotlightedSeller.avatarUrl} alt="" width={22} height={22} unoptimized />
              <span className="artisan-spotlight-text">
                Crafted in <strong>{spotlightedSeller.locationName}</strong> by {spotlightedSeller.name}
              </span>
            </div>
          ) : null}

          <span className="eyebrow">Rarotonga · Cook Islands</span>
          <h1 className="display motion-stagger">
            <span style={{ ['--stagger' as string]: 0 }}>Island-made.</span><br />
            <em style={{ ['--stagger' as string]: 1 }}>Moved together.</em>
          </h1>
          <p className="lede">Discover work made close to the water, then see the shared journey from pickup to home.</p>
          <div className="hero-actions">
            <button className="button-primary pressable" type="button" onClick={onOpenCart}>
              See the shared journey <ArrowRight size={15} />
            </button>
            <button className="button-secondary pressable" type="button" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>
              Browse island pieces
            </button>
          </div>
        </div>

        {/* Minimalist Flat Aside */}
        <aside className="hero-aside">
          <div>
            <div className="hero-aside-header">
              <span className="eyebrow">Pacific gateway</span>
              <span className="radar-live-pill">Vessel active</span>
            </div>

            <div className="hero-aside-body">
              <h2>{selectedDeparture?.label ?? 'Friday West Coast Batch'}</h2>
              <p>One parcel network for small island workshops. Fill available freight capacity across the ocean.</p>

              {/* Minimal Flat Departure Cutoff */}
              <div className="departure-countdown-bar" title="Cutoff for next batch consolidation">
                <Clock size={13} />
                <span>Cutoff:</span>
                <strong className="countdown-digits">{countdownText}</strong>
              </div>
            </div>
          </div>

          {/* Minimal Solid-Color Cargo Gauges */}
          <div className="cargo-gauges">
            <div className="cargo-gauge-row">
              <div className="cargo-gauge-header">
                <span>Payload ({batch.currentWeightKg} / {selectedDeparture?.maxWeightKg ?? 180} kg)</span>
                <strong>{weightPercent}%</strong>
              </div>
              <div className="cargo-track" aria-label={`${weightPercent}% weight filled`}>
                <div className="cargo-fill-weight" style={{ transform: `scaleX(${weightUtilization})` }} />
              </div>
            </div>

            <div className="cargo-gauge-row">
              <div className="cargo-gauge-header">
                <span>Volume ({batch.currentVolumeM3} / {selectedDeparture?.maxVolumeM3 ?? 1.1} m³)</span>
                <strong>{volumePercent}%</strong>
              </div>
              <div className="cargo-track" aria-label={`${volumePercent}% volume filled`}>
                <div className="cargo-fill-volume" style={{ transform: `scaleX(${volumeUtilization})` }} />
              </div>
            </div>
          </div>
        </aside>
      </section>

      <section className="signal-band motion-stagger" aria-label="Coconut network signals">
        <div className="signal-cell" style={{ ['--stagger' as string]: 0 }}><span className="tiny-label">The network effect</span><strong>{orderCount} orders moving together</strong><p>Shared pickup, shared freight, less empty ocean.</p></div>
        <div className="signal-cell" style={{ ['--stagger' as string]: 1 }}><span className="tiny-label">Local makers</span><strong>{sellerCount} workshops</strong><p>Across Rarotonga’s coast.</p></div>
        <div className="signal-cell" style={{ ['--stagger' as string]: 2 }}><span className="tiny-label">Current signal</span><strong><ShipWheel size={18} style={{ display: 'inline', verticalAlign: '-3px' }} /> {batch.weatherLabel.toLowerCase()} seas</strong><p>Route reliability is part of every recommendation.</p></div>
      </section>

      <section ref={howReveal.ref} className={`how-it-works ${howReveal.className}`} aria-labelledby="how-coconut-works">
        <div className="how-header"><div><span className="eyebrow">The simple version</span><h2 id="how-coconut-works" className="section-heading">How <em>Coconut</em> works</h2></div><p>Independent makers stay independent. Coconut coordinates the expensive movement between them.</p></div>
        <ol className="how-grid">
          <li className="how-step"><span className="how-step-index">01</span><div><h3>Shop local</h3><p>Buy directly from island artisans and discover the story behind each piece.</p></div></li>
          <li className="how-step"><span className="how-step-index"><PackageCheck size={17} /></span><div><h3>Ship together</h3><p>Compatible orders share a departure and a fair slice of fixed freight.</p></div></li>
          <li className="how-step"><span className="how-step-index"><Box size={17} /></span><div><h3>Pack with care</h3><p>Carton fit and marginal shipping cost shape each suggestion.</p></div></li>
          <li className="how-step"><span className="how-step-index"><RouteIcon size={17} /></span><div><h3>Plan the pickup</h3><p>Pickup windows, vehicle capacity, and marine conditions shape the move.</p></div></li>
        </ol>
      </section>

      <section id="collection" ref={collectionReveal.ref} className={`section-topline ${collectionReveal.className}`}>
        <div><span className="eyebrow">The collection</span><h2 className="section-heading">Pieces with a <em>place</em></h2></div>
        <p>Small-batch objects from fictional island workshops, seeded for this demo and ready to join your next departure.</p>
      </section>

      <div className="product-controls">
        <div className="filter-group-wrap" ref={filterNavRef} role="tablist" aria-label="Filter products by category">
          <span
            className="filter-pill-indicator"
            aria-hidden="true"
            style={{ transform: `translateX(${filterIndicator.x}px)`, width: filterIndicator.width }}
          />
          <div className="filter-group">
            {categories.map((item) => (
              <button
                key={item}
                ref={(el) => { if (category === item) activeTabRef.current = el; }}
                className={`filter-button ${category === item ? 'active' : ''}`}
                type="button"
                role="tab"
                aria-selected={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <label className="search-wrap">
          <Search size={14} aria-hidden="true" />
          <span className="sr-only">Search the island collection</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search the island collection..."
            title="Search island-made pieces"
          />
        </label>
        <span className="result-count">{visibleProducts.length} of {products.length} pieces</span>
      </div>

      <div className="product-grid motion-stagger" aria-live="polite">
        {visibleProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            seller={sellerMap.get(product.sellerId)}
            index={index}
            added={cartIds.has(product.id)}
            onAdd={handleAddWithParticle}
            onQuickView={(p) => setPreviewProduct(p)}
          />
        ))}
      </div>

      <div className="notice" style={{ marginTop: 24 }}><UsersRound size={16} /><span><strong>Try the proof point:</strong> add the $32 Handwoven Coastal Basket, then add Shell Earrings. The earrings ride inside the same parcel for <strong>$0 estimated shipping delta.</strong></span></div>
      <div className="footer-note"><span><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Rarotonga → Auckland → everywhere</span><span>Demo marketplace data · deterministic fallback ready</span></div>

      {/* Quick View Drawer Modal */}
      {previewProduct ? (
        <ProductModal
          product={previewProduct}
          seller={sellerMap.get(previewProduct.sellerId)}
          added={cartIds.has(previewProduct.id)}
          onAdd={handleAddWithParticle}
          onClose={() => setPreviewProduct(null)}
        />
      ) : null}
    </main>
  );
}
