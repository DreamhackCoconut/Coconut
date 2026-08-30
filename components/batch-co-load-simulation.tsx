'use client';

import { Box, Check, Info, Layers, Package } from 'lucide-react';
import type { CartLine, Product, Quote } from '@/lib/domain/types';

export function BatchCoLoadSimulation({
  lines,
  products,
  quote,
}: {
  lines: CartLine[];
  products: Product[];
  quote: Quote | null;
}) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const userItemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  const boxes = quote?.packing.boxes ?? [];
  const primaryBox = boxes[0];
  const cartonCode = primaryBox?.cartonCode ?? 'M';
  const boxUtilization = primaryBox ? Math.round(primaryBox.utilization * 100) : 68;

  return (
    <div className="co-load-sim motion-fade">
      <div className="co-load-header">
        <div className="co-load-title">
          <Layers size={16} color="var(--teal)" />
          <div>
          <span className="tiny-label">Carton layout</span>
            <h3>Batch Co-Load Packing Simulation</h3>
          </div>
        </div>
        <span className="co-load-badge">
          Size {cartonCode} Carton · {boxUtilization}% Packed
        </span>
      </div>

      <div className="co-load-body">
        {/* Isometric 2.5D Carton Packing Box */}
        <div className="carton-iso-view" aria-label="3D Carton co-load space preview">
          <div className="carton-iso-box">
            {/* Box Back & Bottom */}
            <div className="carton-floor" />
            
            {/* Packed Items (User items in Teal, Community co-load items in Sand/Coral) */}
            <div className="packed-layer">
              {lines.map((line, idx) => {
                const p = productMap.get(line.productId);
                return (
                  <div
                    key={line.productId}
                    className="iso-item user-item"
                    style={{
                      ['--item-idx' as string]: idx,
                      flex: `${Math.max(1, Math.min(3, Math.round((p?.weightKg ?? 0.5) * 2)))} 1 auto`,
                    }}
                    title={`${p?.name ?? 'Item'} (${line.quantity}x)`}
                  >
                    <span className="iso-item-tag">Your: {p?.name ?? 'Item'}</span>
                  </div>
                );
              })}

              {/* Neighboring community items co-loaded into this batch */}
              <div className="iso-item community-item" style={{ flex: '2 1 auto' }} title="Neighboring Order #492 (Handcrafted Tiare Spoon)">
                <span className="iso-item-tag">Co-load: Order #492</span>
              </div>
              <div className="iso-item community-item alt" style={{ flex: '1.5 1 auto' }} title="Neighboring Order #510 (Muri Shell Charm)">
                <span className="iso-item-tag">Co-load: Order #510</span>
              </div>
            </div>
          </div>
        </div>

        <div className="co-load-stats">
          <div className="co-load-stat-row">
            <span>Your items sharing space</span>
            <strong>{userItemCount} pieces</strong>
          </div>
          <div className="co-load-stat-row">
            <span>Community parcels grouped</span>
            <strong>2 neighboring orders</strong>
          </div>
          <div className="co-load-stat-row">
            <span>Dead space eliminated</span>
            <strong style={{ color: 'var(--teal-deep)' }}>+42% efficiency</strong>
          </div>
          <div className="co-load-note">
            <Info size={13} color="var(--teal)" />
            <span>Items share dimensional volume rather than billing minimum empty weight.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
