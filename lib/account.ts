import { Account, Client, ID } from 'appwrite';
import type { CartLine, Product, ProductCategory, Seller } from '@/lib/domain/types';

const ACTIVE_ACCOUNT_KEY = 'coconut.active-account';
const LOCAL_ACCOUNTS_KEY = 'coconut.local-accounts';
const GUEST_CART_KEY = 'coconut.cart.guest';
const SELLER_LISTINGS_KEY = 'coconut.seller-listings';
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=86';

export type CoconutAccount = {
  id: string;
  name: string;
  email: string;
  source: 'appwrite' | 'local';
  sellerLocation?: { name: string; latitude: number; longitude: number };
};

export type SellerListingInput = {
  name: string;
  description: string;
  category: ProductCategory;
  priceUsd: number;
  inventory: number;
  weightKg: number;
  locationName: string;
  latitude: number;
  longitude: number;
  imageUrl?: string;
};

export type SellerListing = { seller: Seller; product: Product; ownerId: string };

type LocalAccount = CoconutAccount & { passwordHash: string };
type AccountPrefs = Record<string, unknown> & {
  coconutCart?: CartLine[];
  coconutSellerLocation?: CoconutAccount['sellerLocation'];
  coconutSellerListings?: SellerListing[];
};

function browserStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function readJson<T>(key: string, fallback: T): T {
  const storage = browserStorage();
  if (!storage) return fallback;
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  browserStorage()?.setItem(key, JSON.stringify(value));
}

function appwriteAccount(): Account | undefined {
  if (typeof window === 'undefined') return undefined;
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT?.trim();
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID?.trim();
  if (!endpoint || !projectId || projectId === '<PROJECT_ID>' || endpoint.includes('<REGION>')) return undefined;
  const client = new Client().setEndpoint(endpoint).setProject(projectId);
  return new Account(client);
}

function accountFromLocal(account: LocalAccount): CoconutAccount {
  const { passwordHash: _passwordHash, ...publicAccount } = account;
  return publicAccount;
}

function accountFromAppwrite(user: { $id: string; name?: string; email?: string }, prefs: AccountPrefs = {}): CoconutAccount {
  return {
    id: user.$id,
    name: user.name?.trim() || user.email?.split('@')[0] || 'Coconut member',
    email: user.email ?? '',
    source: 'appwrite',
    sellerLocation: prefs.coconutSellerLocation,
  };
}

async function digest(value: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return value.split('').reduce((hash, character) => `${hash}${character.charCodeAt(0).toString(16)}`, 'demo-');
}

async function getPrefs(account: Account): Promise<AccountPrefs> {
  try {
    return await account.getPrefs() as AccountPrefs;
  } catch {
    return {};
  }
}

export async function getCurrentAccount(): Promise<CoconutAccount | null> {
  const account = appwriteAccount();
  if (account) {
    try {
      const user = await account.get();
      const prefs = await getPrefs(account);
      mergeSellerListings(Array.isArray(prefs.coconutSellerListings) ? prefs.coconutSellerListings : []);
      return accountFromAppwrite(user, prefs);
    } catch {
      // A configured Appwrite project can still be used in local demo mode while it is empty.
    }
  }
  const active = readJson<LocalAccount | null>(ACTIVE_ACCOUNT_KEY, null);
  return active ? accountFromLocal(active) : null;
}

export async function createAccount(input: { name: string; email: string; password: string }): Promise<CoconutAccount> {
  const account = appwriteAccount();
  if (account) {
    try {
      await account.create({ userId: ID.unique(), email: input.email.trim(), password: input.password, name: input.name.trim() });
      await account.createEmailPasswordSession({ email: input.email.trim(), password: input.password });
      const user = await account.get();
      return accountFromAppwrite(user, await getPrefs(account));
    } catch (error) {
      if (error instanceof Error && /already exists|user with the same email/i.test(error.message)) throw error;
      // Fall through to the local demo account when Appwrite is unavailable during setup.
    }
  }

  const accounts = readJson<LocalAccount[]>(LOCAL_ACCOUNTS_KEY, []);
  if (accounts.some((candidate) => candidate.email.toLowerCase() === input.email.trim().toLowerCase())) throw new Error('An account with that email already exists.');
  const local: LocalAccount = { id: `local-${Date.now().toString(36)}`, name: input.name.trim(), email: input.email.trim(), source: 'local', passwordHash: await digest(input.password) };
  writeJson(LOCAL_ACCOUNTS_KEY, [...accounts, local]);
  writeJson(ACTIVE_ACCOUNT_KEY, local);
  return accountFromLocal(local);
}

export async function signIn(input: { email: string; password: string }): Promise<CoconutAccount> {
  const account = appwriteAccount();
  if (account) {
    try {
      await account.createEmailPasswordSession({ email: input.email.trim(), password: input.password });
      const user = await account.get();
      return accountFromAppwrite(user, await getPrefs(account));
    } catch {
      // Try the local demo account below when the project is not provisioned yet.
    }
  }

  const candidate = readJson<LocalAccount[]>(LOCAL_ACCOUNTS_KEY, []).find((item) => item.email.toLowerCase() === input.email.trim().toLowerCase());
  if (!candidate || candidate.passwordHash !== await digest(input.password)) throw new Error('We could not match that email and password.');
  writeJson(ACTIVE_ACCOUNT_KEY, candidate);
  return accountFromLocal(candidate);
}

export async function signOut(): Promise<void> {
  const account = appwriteAccount();
  if (account) {
    try { await account.deleteSession({ sessionId: 'current' }); } catch { /* already signed out */ }
  }
  browserStorage()?.removeItem(ACTIVE_ACCOUNT_KEY);
}

function cartKey(accountId?: string) { return accountId ? `coconut.cart.${accountId}` : GUEST_CART_KEY; }

export async function loadSavedCart(accountId?: string): Promise<CartLine[] | undefined> {
  const account = accountId ? appwriteAccount() : undefined;
  if (account) {
    const prefs = await getPrefs(account);
    if (Array.isArray(prefs.coconutCart)) return prefs.coconutCart;
  }
  return readJson<CartLine[] | undefined>(cartKey(accountId), undefined);
}

export async function saveCart(accountId: string | undefined, lines: CartLine[]): Promise<void> {
  writeJson(cartKey(accountId), lines);
  if (!accountId) return;
  const account = appwriteAccount();
  if (!account) return;
  try {
    const prefs = await getPrefs(account);
    await account.updatePrefs({ prefs: { ...prefs, coconutCart: lines } });
  } catch {
    // Local persistence remains the deterministic fallback.
  }
}

export function getStoredSellerListings(): SellerListing[] {
  return readJson<SellerListing[]>(SELLER_LISTINGS_KEY, []);
}

function mergeSellerListings(incoming: SellerListing[]) {
  if (!incoming.length) return;
  const existing = getStoredSellerListings();
  const merged = [...existing];
  for (const listing of incoming) {
    const index = merged.findIndex((candidate) => candidate.product.id === listing.product.id);
    if (index === -1) merged.push(listing);
    else merged[index] = listing;
  }
  writeJson(SELLER_LISTINGS_KEY, merged);
}

export async function createSellerListing(accountProfile: CoconutAccount, input: SellerListingInput): Promise<SellerListing> {
  const sellerId = `seller-${accountProfile.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || Date.now().toString(36)}`;
  const productId = `product-${accountProfile.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'member'}-${Date.now().toString(36)}`;
  const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'island-piece'}-${productId.slice(-6)}`;
  const seller: Seller = {
    id: sellerId,
    name: accountProfile.name,
    slug: `${accountProfile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'island-artisan'}-${sellerId.slice(-6)}`,
    bio: `Independent maker based in ${input.locationName}.`,
    locationName: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    pickupWindowStart: '08:00',
    pickupWindowEnd: '16:00',
    productionCapacityHoursPerDay: 5,
    recentImpressions: 0,
    rating: 5,
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(accountProfile.name)}`,
  };
  const product: Product = {
    id: productId,
    sellerId,
    name: input.name.trim(),
    slug,
    description: input.description.trim(),
    category: input.category,
    tags: ['new listing', 'island-made'],
    materials: ['maker-selected'],
    colors: [],
    priceUsd: input.priceUsd,
    unitCostUsd: Number((input.priceUsd * 0.45).toFixed(2)),
    inventory: input.inventory,
    productionHours: 1,
    weightKg: input.weightKg,
    lengthCm: 20,
    widthCm: 20,
    heightCm: 10,
    fragile: false,
    stackable: true,
    imageUrl: input.imageUrl?.trim() || DEFAULT_IMAGE_URL,
    active: true,
  };
  const listing = { seller, product, ownerId: accountProfile.id };
  const listings = getStoredSellerListings().filter((candidate) => candidate.ownerId !== accountProfile.id || candidate.product.id !== product.id);
  writeJson(SELLER_LISTINGS_KEY, [...listings, listing]);

  const account = accountProfile.source === 'appwrite' ? appwriteAccount() : undefined;
  if (account) {
    try {
      const prefs = await getPrefs(account);
      const saved = Array.isArray(prefs.coconutSellerListings) ? prefs.coconutSellerListings : [];
      await account.updatePrefs({ prefs: { ...prefs, coconutSellerListings: [...saved.filter((candidate) => candidate.product.id !== product.id), listing], coconutSellerLocation: { name: input.locationName, latitude: input.latitude, longitude: input.longitude } } });
    } catch {
      // The browser copy remains available while the Appwrite project is being configured.
    }
  }
  return listing;
}
