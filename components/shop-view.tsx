'use client';

import { ArrowRight, Box, CircleCheck, MapPin, PackageCheck, Plus, Route as RouteIcon, Search, ShipWheel, UsersRound } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { BatchSnapshot, CartLine, Departure, Product, ProductCategory, Seller } from '@/lib/domain/types';
import { useReveal } from '@/components/use-reveal';

const categories: Array<'All' | ProductCategory> = ['All', 'Basketry', 'Jewelry', 'Woodwork', 'Textiles', 'Ceramics', 'Prints'];

function ProductCard({ product, seller, index, added, onAdd }: { product: Product; seller?: Seller; index: number; added: boolean; onAdd: (product: Product) => void }) {
  return (
    <article className="product-card" style={{ ['--stagger' as string]: index }}>
      <div className="product-image">
        <Image src={product.imageUrl} alt={product.name} fill sizes="(max-width: 560px) 50vw, (max-width: 1080px) 33vw, 25vw" priority={index < 4} unoptimized />
        <span className="product-tag">{product.category}</span>
      </div>
      <div className="product-card-body">
        <div className="seller-line">
          {seller ? <Image className="seller-avatar" src={seller.avatarUrl} alt="" width={20} height={20} unoptimized /> : null}
          <span>{seller?.name ?? 'Island artisan'}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-meta">
          <span className="price">${product.priceUsd}</span>
          <button className="add-icon pressable" type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`} title={added ? 'Add another' : 'Add to cart'}>
            {added ? <CircleCheck size={16} strokeWidth={2.2} /> : <Plus size={17} strokeWidth={2.2} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export function ShopView({ products, sellers, departures, batch, cartLines, onAdd, onOpenCart }: { products: Product[]; sellers: Seller[]; departures: Departure[]; batch: BatchSnapshot; cartLines: CartLine[]; onAdd: (product: Product) => void; onOpenCart: () => void }) {
  const [category, setCategory] = useState<'All' | ProductCategory>('All');
  const [search, setSearch] = useState('');
  const howReveal = useReveal<HTMLElement>();
  const collectionReveal = useReveal<HTMLElement>();
  const selectedDeparture = departures.find((departure) => departure.id === batch.departureId) ?? departures[1] ?? departures[0];
  const utilization = selectedDeparture ? Math.max(batch.currentWeightKg / selectedDeparture.maxWeightKg, batch.currentVolumeM3 / selectedDeparture.maxVolumeM3) : 0;
  const sellerMap = useMemo(() => new Map(sellers.map((seller) => [seller.id, seller])), [sellers]);
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
      <section className="hero-grid motion-fade">
        <div className="hero-copy">
          <span className="eyebrow">Rarotonga · Cook Islands</span>
          <h1 className="display motion-stagger"><span style={{ ['--stagger' as string]: 0 }}>Island-made.</span><br /><em style={{ ['--stagger' as string]: 1 }}>Smarter shipped.</em></h1>
          <p className="lede">Discover work made close to the water, then let Coconut find the cleanest shared journey home.</p>
          <div className="hero-actions">
            <button className="button-primary pressable" type="button" onClick={onOpenCart}>See the shared journey <ArrowRight size={15} /></button>
            <button className="button-secondary pressable" type="button" onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}>Browse island pieces</button>
          </div>
        </div>
        <aside className="hero-aside">
          <span className="hero-dot hero-dot-a" aria-hidden="true" /><span className="hero-dot hero-dot-b" aria-hidden="true" /><span className="hero-dot hero-dot-c" aria-hidden="true" />
          <span className="eyebrow">Next shared departure</span>
          <h2>{selectedDeparture?.label ?? 'Friday West Coast Batch'}</h2>
          <p>One parcel network for many small makers. Fill the space already moving across the Pacific.</p>
          <div className="batch-stat">
            <span>batch filled</span>
            <strong>{Math.round(utilization * 100)}%</strong>
            <div className="progress-track" aria-label={`${Math.round(utilization * 100)} percent of batch filled`}><div className="progress-fill" style={{ ['--progress' as string]: utilization }} /></div>
          </div>
        </aside>
      </section>

      <section className="signal-band motion-stagger" aria-label="Coconut network signals">
        <div className="signal-cell" style={{ ['--stagger' as string]: 0 }}><span className="tiny-label">The network effect</span><strong>{batch.orderCount} orders moving together</strong><p>Shared pickup, shared freight, less empty ocean.</p></div>
        <div className="signal-cell" style={{ ['--stagger' as string]: 1 }}><span className="tiny-label">Local makers</span><strong>{sellers.length} workshops</strong><p>Across Rarotonga’s coast.</p></div>
        <div className="signal-cell" style={{ ['--stagger' as string]: 2 }}><span className="tiny-label">Current signal</span><strong><ShipWheel size={18} style={{ display: 'inline', verticalAlign: '-3px' }} /> {batch.weatherLabel.toLowerCase()} seas</strong><p>Route reliability is part of every recommendation.</p></div>
      </section>

      <section ref={howReveal.ref} className={`how-it-works ${howReveal.className}`} aria-labelledby="how-coconut-works">
        <div className="how-header"><div><span className="eyebrow">The simple version</span><h2 id="how-coconut-works" className="section-heading">How <em>Coconut</em> works</h2></div><p>Independent makers stay independent. Coconut coordinates the expensive movement between them.</p></div>
        <ol className="how-grid">
          <li className="how-step"><span className="how-step-index">01</span><div><h3>Shop local</h3><p>Buy directly from island artisans and discover the story behind each piece.</p></div></li>
          <li className="how-step"><span className="how-step-index"><PackageCheck size={17} /></span><div><h3>Ship together</h3><p>Compatible orders share a departure and a fair slice of fixed freight.</p></div></li>
          <li className="how-step"><span className="how-step-index"><Box size={17} /></span><div><h3>Pack smarter</h3><p>Carton fit and marginal shipping cost shape the next recommendation.</p></div></li>
          <li className="how-step"><span className="how-step-index"><RouteIcon size={17} /></span><div><h3>Route smarter</h3><p>Pickup windows, vehicle capacity, and marine conditions inform the move.</p></div></li>
        </ol>
      </section>

      <section id="collection" ref={collectionReveal.ref} className={`section-topline ${collectionReveal.className}`}>
        <div><span className="eyebrow">The collection</span><h2 className="section-heading">Pieces with a <em>place</em></h2></div>
        <p>Small-batch objects from fictional island workshops, seeded for this demo and ready to join your next departure.</p>
      </section>
      <div className="product-controls">
        <div className="filter-group" role="tablist" aria-label="Filter products by category">
          {categories.map((item) => <button key={item} className={`filter-button ${category === item ? 'active' : ''}`} type="button" role="tab" aria-selected={category === item} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
        <label className="search-wrap"><Search size={14} aria-hidden="true" /><span className="sr-only">Search the island collection</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search the island collection" title="Search island-made pieces" /></label>
        <span className="result-count">{visibleProducts.length} of {products.length} pieces</span>
      </div>
      <div className="product-grid motion-stagger" aria-live="polite">
        {visibleProducts.map((product, index) => <ProductCard key={product.id} product={product} seller={sellerMap.get(product.sellerId)} index={index} added={cartIds.has(product.id)} onAdd={onAdd} />)}
      </div>

      <div className="notice" style={{ marginTop: 24 }}><UsersRound size={16} /><span><strong>Try the proof point:</strong> add the $32 Handwoven Coastal Basket, then add Shell Earrings. The earrings ride inside the same parcel for <strong>$0 estimated shipping delta.</strong></span></div>
      <div className="footer-note"><span><MapPin size={12} style={{ display: 'inline', verticalAlign: '-2px' }} /> Rarotonga → Auckland → everywhere</span><span>Demo marketplace data · deterministic fallback ready</span></div>
    </main>
  );
}
