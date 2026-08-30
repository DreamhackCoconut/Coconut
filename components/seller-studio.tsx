'use client';

import { ArrowRight, BadgeDollarSign, Check, MapPin, Plus } from 'lucide-react';
import { useState } from 'react';
import { createSellerListing, type CoconutAccount, type SellerListing, type SellerListingInput } from '@/lib/account';
import type { ProductCategory } from '@/lib/domain/types';

const CATEGORIES: ProductCategory[] = ['Jewelry', 'Basketry', 'Woodwork', 'Textiles', 'Ceramics', 'Prints'];

export function SellerStudio({ account, onRequireAccount, onCreated }: { account: CoconutAccount | null; onRequireAccount: () => void; onCreated: (listing: SellerListing) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Basketry');
  const [price, setPrice] = useState('32');
  const [inventory, setInventory] = useState('4');
  const [weight, setWeight] = useState('0.8');
  const [location, setLocation] = useState(account?.sellerLocation?.name ?? 'Rarotonga · Cook Islands');
  const [latitude, setLatitude] = useState(String(account?.sellerLocation?.latitude ?? -21.205));
  const [longitude, setLongitude] = useState(String(account?.sellerLocation?.longitude ?? -159.776));
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function openStudio() {
    if (!account) { onRequireAccount(); return; }
    setOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;
    const parsedPrice = Number(price);
    const parsedInventory = Number(inventory);
    const parsedWeight = Number(weight);
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (!name.trim() || !description.trim() || !location.trim() || !Number.isFinite(parsedPrice) || parsedPrice <= 0 || !Number.isInteger(parsedInventory) || parsedInventory < 1 || !Number.isFinite(parsedWeight) || parsedWeight <= 0 || !Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      setError('Add the piece, price, inventory, and a valid pickup location before publishing.');
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const input: SellerListingInput = { name, description, category, priceUsd: parsedPrice, inventory: parsedInventory, weightKg: parsedWeight, locationName: location, latitude: parsedLatitude, longitude: parsedLongitude, imageUrl };
      const listing = await createSellerListing(account, input);
      onCreated(listing);
      setSuccess(true);
      setName('');
      setDescription('');
    } catch {
      setError('The listing could not be saved yet. Your existing workspace is still safe.');
    } finally {
      setBusy(false);
    }
  }

  return <section className="seller-studio panel"><div className="seller-studio-copy"><span className="panel-kicker">Seller workspace</span><h2 className="panel-title">Bring your place to the island collection.</h2><p>List a piece from any location. Coconut saves your maker profile and keeps the listing ready for the next shared departure.</p><div className="studio-meta"><span><MapPin size={13} /> {account?.sellerLocation?.name ?? 'choose your pickup place'}</span><span><BadgeDollarSign size={13} /> no seller fee in demo</span></div></div><div className="seller-studio-action">{account ? <><button className="button-primary pressable" type="button" onClick={() => { setOpen((value) => !value); setSuccess(false); }}>{open ? 'Close listing form' : 'List a piece'} <Plus size={14} /></button>{success ? <p className="studio-success" role="status"><Check size={13} /> Saved to your seller workspace.</p> : null}</> : <><p className="tiny-label">Want to sell here?</p><button className="button-secondary pressable" type="button" onClick={openStudio}>Create a seller account <ArrowRight size={14} /></button></>}</div>{open && account ? <form className="seller-form" onSubmit={submit}><div className="form-heading"><div><span className="tiny-label">New listing</span><strong>Tell the collection what you make.</strong></div><span className="mono">{account.name}</span></div><div className="form-grid"><label>Piece name<input value={name} onChange={(event) => setName(event.target.value)} required placeholder="e.g. Lagoon reed tray" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value as ProductCategory)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label>Price (USD)<input type="number" min="1" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} required /></label><label>Available pieces<input type="number" min="1" step="1" value={inventory} onChange={(event) => setInventory(event.target.value)} required /></label><label>Weight (kg)<input type="number" min="0.01" step="0.01" value={weight} onChange={(event) => setWeight(event.target.value)} required /></label><label>Image URL <span className="muted">(optional)</span><input type="url" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://…" /></label><label className="form-grid-wide">Pickup location<input value={location} onChange={(event) => setLocation(event.target.value)} required placeholder="Town, island, country" /></label><label>Latitude<input type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} required /></label><label>Longitude<input type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} required /></label><label className="form-grid-wide">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={3} placeholder="What makes this piece worth the shared journey?" /></label></div>{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="button-primary pressable" type="submit" disabled={busy}>{busy ? 'Saving listing…' : 'Publish to my collection'} <ArrowRight size={14} /></button></form> : null}</section>;
}
