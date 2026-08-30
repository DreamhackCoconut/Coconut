'use client';

import { Box, Check, CircleHelp, MapPin, Package, Plus, Sparkles, Star, Tag, Weight, X } from 'lucide-react';
import Image from 'next/image';
import type { Product, Seller } from '@/lib/domain/types';

export function ProductModal({
  product,
  seller,
  added,
  onAdd,
  onClose,
}: {
  product: Product;
  seller?: Seller;
  added: boolean;
  onAdd: (product: Product) => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="quickview-title">
      <div className="product-quick-drawer motion-fade">
        <button className="icon-close pressable" type="button" onClick={onClose} aria-label="Close preview">
          <X size={16} />
        </button>

        <div className="quick-drawer-grid">
          <div className="quick-drawer-image">
            <Image src={product.imageUrl} alt={product.name} fill sizes="500px" priority unoptimized />
            <span className="product-tag">{product.category}</span>
          </div>

          <div className="quick-drawer-content">
            <div className="seller-line" style={{ marginBottom: 8 }}>
              {seller?.avatarUrl ? <Image className="seller-avatar" src={seller.avatarUrl} alt="" width={22} height={22} unoptimized /> : null}
              <span>{seller?.name ?? 'Island artisan'} · {seller?.locationName ?? 'Rarotonga'}</span>
            </div>

            <h2 id="quickview-title">{product.name}</h2>
            <p className="quick-desc">{product.description}</p>

            <div className="quick-stats-grid">
              <div className="quick-stat-card">
                <span className="tiny-label">materials</span>
                <strong>{product.materials.join(', ') || 'Natural fibre'}</strong>
              </div>
              <div className="quick-stat-card">
                <span className="tiny-label">weight & dims</span>
                <strong>{product.weightKg} kg · {product.lengthCm}×{product.widthCm}×{product.heightCm} cm</strong>
              </div>
              <div className="quick-stat-card">
                <span className="tiny-label">shared packing</span>
                <strong style={{ color: 'var(--teal-deep)' }}>Fits standard carton</strong>
              </div>
              <div className="quick-stat-card">
                <span className="tiny-label">island origin</span>
                <strong>{seller?.locationName ?? 'Avatiu Coast'}</strong>
              </div>
            </div>

            {seller?.bio ? (
              <div className="artisan-bio-box">
                <span className="tiny-label">About the workshop</span>
                <p>{seller.bio}</p>
              </div>
            ) : null}

            <div className="quick-drawer-actions">
              <div className="price-box">
                <span className="tiny-label">Direct artisan price</span>
                <strong className="price">${product.priceUsd}</strong>
              </div>
              <button
                className="button-primary pressable"
                type="button"
                onClick={() => {
                  onAdd(product);
                  onClose();
                }}
              >
                {added ? <Check size={16} /> : <Plus size={16} />}
                {added ? 'Added · Add Another' : 'Add to Shared Parcel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
