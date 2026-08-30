import { shouldUseLiveProvider } from '@/lib/config/env';
import type { Destination, FinalMileQuote, PackingResult, ProviderResult } from '@/lib/domain/types';
import { estimateFinalMile } from '@/lib/engines/shipping';
import { getOrFetch } from '@/lib/server/cache';

function demoRate(packing: PackingResult, destination: Destination): ProviderResult<FinalMileQuote> {
  return { data: estimateFinalMile(packing, destination), metadata: { provider: 'EasyPost', mode: 'demo', fetchedAt: new Date().toISOString() } };
}

export async function getFinalMileRate(packing: PackingResult, destination: Destination): Promise<ProviderResult<FinalMileQuote>> {
  const key = process.env.EASYPOST_API_KEY;
  if (!shouldUseLiveProvider(key) || !packing.boxes.length) return demoRate(packing, destination);
  return getOrFetch({
    key: `easypost-rate:${destination.countryCode}:${destination.postalCode}:${packing.boxes.map((box) => `${box.cartonCode}-${box.shippingWeightKg}`).join('|')}`,
    provider: 'EasyPost',
    ttlMs: 20 * 60 * 1000,
    fetcher: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const fromAddress = { street1: 'Avatiu Harbour', city: 'Avarua', state: 'Rarotonga', zip: 'CK0000', country: 'CK' };
        const toAddress = { street1: 'Demo destination', city: destination.region || 'West Coast', state: destination.region || 'NA', zip: destination.postalCode, country: destination.countryCode };
        const parcel = { weight: Math.max(1, packing.boxes.reduce((sum, box) => sum + box.shippingWeightKg, 0) * 35.274), length: Math.max(...packing.boxes.map((box) => box.dimensions[0])), width: Math.max(...packing.boxes.map((box) => box.dimensions[1])), height: Math.max(...packing.boxes.map((box) => box.dimensions[2])) };
        const response = await fetch('https://api.easypost.com/v2/shipments', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${key as string}:`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ shipment: { from_address: fromAddress, to_address: toAddress, parcel } }), signal: controller.signal });
        if (!response.ok) throw new Error(`EasyPost returned ${response.status}`);
        const payload = await response.json() as { shipment?: { rates?: Array<{ rate?: string; carrier?: string; service?: string; delivery_days?: number }> } };
        const rate = payload.shipment?.rates?.sort((a, b) => Number(a.rate ?? 999) - Number(b.rate ?? 999))[0];
        const rateUsd = Number(rate?.rate);
        const deliveryDays = Number(rate?.delivery_days ?? 8);
        if (!rate?.rate || !Number.isFinite(rateUsd) || rateUsd < 0 || !Number.isFinite(deliveryDays) || deliveryDays < 0) throw new Error('EasyPost payload had no valid rates');
        return { data: { rateUsd, deliveryDaysMin: deliveryDays, deliveryDaysMax: deliveryDays + 2, carrier: rate.carrier ?? 'EasyPost carrier', service: rate.service ?? 'Ground', dataMode: 'live' }, metadata: { provider: 'EasyPost', mode: 'live', fetchedAt: new Date().toISOString() } };
      } finally {
        clearTimeout(timeout);
      }
    },
    fallback: () => demoRate(packing, destination),
  });
}
