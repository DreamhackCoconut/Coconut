import type {
  BatchSnapshot,
  CartonProfile,
  Departure,
  GeoPoint,
  MarketOpportunity,
  Product,
  ProductCategory,
  Seller,
} from '@/lib/domain/types';

const PRODUCT_PHOTOS = [
  'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1605640840605-14ac1855827b?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=86',
  'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=1200&q=86',
];

const AVATAR_PHOTOS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=160&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&q=80',
];

export const DEMO_SELLERS: Seller[] = [
  ['Lani Weaving House', 'lani-weaving-house', 'North Cove', -21.197, -159.775, 42, 4.9],
  ['Kai Carvings', 'kai-carvings', 'Avatiu Ridge', -21.201, -159.789, 68, 4.8],
  ['Mere Ceramics', 'mere-ceramics', 'Avarua East', -21.206, -159.761, 91, 4.7],
  ['Tala Shellcraft', 'tala-shellcraft', 'Matavera', -21.214, -159.738, 27, 4.9],
  ['Pua Marama Studio', 'pua-marama-studio', 'Titikaveka', -21.250, -159.750, 54, 4.8],
  ['Moana Looms', 'moana-looms', 'Ngatangiia', -21.226, -159.723, 112, 4.6],
  ['Rangi Woodworks', 'rangi-woodworks', 'Arorangi', -21.215, -159.831, 35, 4.8],
  ['Te Vai Prints', 'te-vai-prints', 'Nikao', -21.198, -159.818, 22, 4.9],
  ['Mara Fibre Studio', 'mara-fibre-studio', 'Punanga Nui', -21.207, -159.774, 76, 4.7],
  ['Aroa Home Goods', 'aroa-home-goods', 'Aroa', -21.226, -159.856, 46, 4.8],
  ['Hina Thread Co.', 'hina-thread-co', 'Tupapa', -21.194, -159.786, 129, 4.6],
  ['Vaka Clay', 'vaka-clay', 'Kavera', -21.213, -159.806, 63, 4.7],
  ['Nui Nui Atelier', 'nui-nui-atelier', 'Vaimaanga', -21.263, -159.783, 19, 5.0],
  ['Tiare Paper Works', 'tiare-paper-works', 'Muri', -21.236, -159.735, 84, 4.7],
  ['Kōrā Glass & Fibre', 'kora-glass-fibre', 'Tengatangi', -21.221, -159.767, 58, 4.8],
].map(([name, slug, locationName, latitude, longitude, recentImpressions, rating], index) => ({
  id: `seller-${String(index + 1).padStart(2, '0')}`,
  name: String(name),
  slug: String(slug),
  bio: 'A fictional island workshop making small-batch pieces with local materials and patient hands.',
  locationName: String(locationName),
  latitude: Number(latitude),
  longitude: Number(longitude),
  pickupWindowStart: '08:00',
  pickupWindowEnd: '16:00',
  productionCapacityHoursPerDay: index % 3 === 0 ? 7 : 5.5,
  recentImpressions: Number(recentImpressions),
  rating: Number(rating),
  avatarUrl: AVATAR_PHOTOS[index % AVATAR_PHOTOS.length],
}));

type ProductBlueprint = Omit<Product, 'id' | 'sellerId' | 'slug' | 'imageUrl'> & { slug: string };

const ANCHOR_PRODUCTS: ProductBlueprint[] = [
  {
    slug: 'handwoven-coastal-basket',
    name: 'Handwoven Coastal Basket',
    description: 'A sturdy, wave-ready basket woven in a deep ocean stripe for market days and beach homes.',
    category: 'Basketry',
    tags: ['coastal', 'giftable', 'island-made', 'home'],
    materials: ['pandanus', 'coconut fibre'],
    colors: ['sand', 'deep ocean'],
    priceUsd: 32,
    unitCostUsd: 13,
    inventory: 12,
    productionHours: 3,
    weightKg: 1.2,
    lengthCm: 32,
    widthCm: 23,
    heightCm: 17,
    fragile: false,
    stackable: true,
    active: true,
  },
  {
    slug: 'shell-earrings',
    name: 'Shell Earrings',
    description: 'Polished shell drops with a small brass hook, light enough to join almost any shared parcel.',
    category: 'Jewelry',
    tags: ['coastal', 'giftable', 'lightweight', 'island-made'],
    materials: ['shell', 'brass'],
    colors: ['pearl', 'aqua'],
    priceUsd: 14,
    unitCostUsd: 4,
    inventory: 24,
    productionHours: 0.8,
    weightKg: 0.05,
    lengthCm: 7,
    widthCm: 5,
    heightCm: 2,
    fragile: false,
    stackable: true,
    active: true,
  },
  {
    slug: 'woven-tide-bracelet',
    name: 'Woven Tide Bracelet',
    description: 'A soft, adjustable fibre bracelet finished with a tiny carved shell bead.',
    category: 'Jewelry',
    tags: ['coastal', 'giftable', 'lightweight'],
    materials: ['cotton cord', 'shell'],
    colors: ['coral', 'cream'],
    priceUsd: 11,
    unitCostUsd: 3.1,
    inventory: 31,
    productionHours: 0.5,
    weightKg: 0.03,
    lengthCm: 14,
    widthCm: 4,
    heightCm: 2,
    fragile: false,
    stackable: true,
    active: true,
  },
  {
    slug: 'small-wood-ornament',
    name: 'Small Wood Ornament',
    description: 'A palm-sized carved wave for a shelf, tree, or the corner of a new home.',
    category: 'Woodwork',
    tags: ['coastal', 'giftable', 'home'],
    materials: ['breadfruit wood'],
    colors: ['walnut', 'sand'],
    priceUsd: 18,
    unitCostUsd: 6,
    inventory: 17,
    productionHours: 1.4,
    weightKg: 0.24,
    lengthCm: 15,
    widthCm: 8,
    heightCm: 5,
    fragile: false,
    stackable: true,
    active: true,
  },
  {
    slug: 'blue-lagoon-ceramic-vase',
    name: 'Blue Lagoon Ceramic Vase',
    description: 'A hand-thrown, salt-glazed vase with a generous silhouette and a very real shipping footprint.',
    category: 'Ceramics',
    tags: ['coastal', 'home', 'statement'],
    materials: ['stoneware clay', 'salt glaze'],
    colors: ['lagoon blue', 'cream'],
    priceUsd: 46,
    unitCostUsd: 19,
    inventory: 6,
    productionHours: 4.5,
    weightKg: 3.4,
    lengthCm: 38,
    widthCm: 26,
    heightCm: 22,
    fragile: true,
    stackable: false,
    active: true,
  },
  {
    slug: 'large-island-market-basket',
    name: 'Large Island Market Basket',
    description: 'A roomy, low-profile basket for produce, linens, and the things that accumulate by the sea.',
    category: 'Basketry',
    tags: ['home', 'island-made', 'statement'],
    materials: ['pandanus', 'hibiscus fibre'],
    colors: ['natural', 'coral'],
    priceUsd: 58,
    unitCostUsd: 23,
    inventory: 5,
    productionHours: 6,
    weightKg: 2.2,
    lengthCm: 43,
    widthCm: 31,
    heightCm: 24,
    fragile: false,
    stackable: true,
    active: true,
  },
  {
    slug: 'carved-reef-sculpture',
    name: 'Carved Reef Sculpture',
    description: 'A weighty, hand-shaped reef form made for a quiet console or a collector’s shelf.',
    category: 'Woodwork',
    tags: ['statement', 'home', 'island-made'],
    materials: ['tamanu wood'],
    colors: ['dark walnut', 'natural'],
    priceUsd: 74,
    unitCostUsd: 30,
    inventory: 4,
    productionHours: 8,
    weightKg: 4.5,
    lengthCm: 42,
    widthCm: 22,
    heightCm: 18,
    fragile: false,
    stackable: false,
    active: true,
  },
  {
    slug: 'sun-faded-lagoon-scarf',
    name: 'Sun-Faded Lagoon Scarf',
    description: 'A featherlight woven scarf in a soft lagoon gradient, folded ready for the next shared departure.',
    category: 'Textiles',
    tags: ['coastal', 'lightweight', 'giftable', 'wearable'],
    materials: ['cotton', 'linen'],
    colors: ['lagoon', 'cream'],
    priceUsd: 36,
    unitCostUsd: 13,
    inventory: 10,
    productionHours: 2.2,
    weightKg: 0.22,
    lengthCm: 28,
    widthCm: 18,
    heightCm: 4,
    fragile: false,
    stackable: true,
    active: true,
  },
];

type GeneratedBlueprint = [string, ProductCategory, string[], string[], string[], number, number, number, number, number, number, number, number, boolean, boolean, string];

const GENERATED_BLUEPRINTS: GeneratedBlueprint[] = [
  ['Pearl Reef Studs', 'Jewelry', ['shell', 'recycled silver'], ['coastal', 'lightweight', 'giftable'], ['pearl', 'silver'], 16, 4.5, 18, 0.7, 0.04, 5, 4, 2, false, true, 'Small pearl-toned studs shaped and finished in a quiet island studio.'],
  ['Coral Thread Hoops', 'Jewelry', ['brass', 'cotton cord'], ['coastal', 'lightweight', 'wearable'], ['coral', 'brass'], 22, 7, 15, 0.9, 0.06, 7, 7, 2, false, true, 'Light hoops with a coral thread accent and a hand-brushed brass finish.'],
  ['Muri Shell Charm', 'Jewelry', ['shell', 'cotton cord'], ['coastal', 'giftable', 'lightweight'], ['cream', 'aqua'], 12, 3.5, 26, 0.4, 0.04, 8, 4, 2, false, true, 'A tiny shell charm that carries the soft color of the lagoon.'],
  ['Motu Drift Necklace', 'Jewelry', ['shell', 'recycled silver'], ['coastal', 'statement', 'giftable'], ['sand', 'silver'], 39, 13, 8, 1.7, 0.12, 12, 8, 3, false, true, 'A simple pendant with the silhouette of a low island at dusk.'],
  ['Teal Reef Ring', 'Jewelry', ['recycled silver', 'glass'], ['coastal', 'lightweight'], ['teal', 'silver'], 28, 9, 11, 1.1, 0.04, 6, 5, 2, false, true, 'A small sea-glass ring, polished by hand and intentionally irregular.'],
  ['Kite Shell Pendant', 'Jewelry', ['shell', 'brass'], ['coastal', 'giftable'], ['cream', 'brass'], 24, 8, 13, 1.2, 0.08, 9, 7, 2, false, true, 'A geometric shell pendant with a bright, easy silhouette.'],
  ['Moon Tide Cuff', 'Jewelry', ['pandanus fibre', 'shell'], ['island-made', 'wearable'], ['natural', 'ink'], 19, 6, 20, 0.8, 0.06, 16, 5, 3, false, true, 'A woven cuff that softens as it is worn.'],
  ['Lagoon Glass Drops', 'Jewelry', ['sea glass', 'brass'], ['coastal', 'lightweight', 'giftable'], ['lagoon', 'brass'], 26, 8, 14, 0.9, 0.07, 8, 5, 2, false, true, 'Translucent drops in lagoon glass, assembled one pair at a time.'],
  ['Saltwind Charm Set', 'Jewelry', ['shell', 'linen'], ['coastal', 'giftable', 'lightweight'], ['cream', 'sand'], 18, 5, 22, 0.7, 0.04, 7, 5, 2, false, true, 'A small set of charms for a bag, key, or favorite travel pouch.'],
  ['Hibiscus Fibre Anklet', 'Jewelry', ['hibiscus fibre', 'shell'], ['island-made', 'lightweight', 'wearable'], ['coral', 'cream'], 15, 4, 17, 0.6, 0.03, 13, 3, 2, false, true, 'Soft fibre and a shell bead, made for bare feet and warm evenings.'],
  ['Pandanus Breakfast Tray', 'Basketry', ['pandanus', 'coconut fibre'], ['home', 'island-made'], ['natural', 'sand'], 44, 18, 8, 4, 1.3, 35, 25, 6, false, true, 'A low, sturdy tray for breakfast, books, and slow mornings.'],
  ['Woven Palm Planter', 'Basketry', ['pandanus', 'coir'], ['home', 'island-made'], ['natural', 'ink'], 38, 15, 9, 3.3, 1.1, 30, 27, 25, false, true, 'A breathable planter cover with a strong, simple weave.'],
  ['Reefline Storage Bowl', 'Basketry', ['pandanus', 'hibiscus fibre'], ['home', 'coastal'], ['sand', 'teal'], 29, 10, 13, 2.4, 0.8, 27, 27, 12, false, true, 'A wide storage bowl for keys, folded cloth, or found shells.'],
  ['Twined Laundry Hamper', 'Basketry', ['pandanus', 'coconut fibre'], ['home', 'island-made', 'statement'], ['natural', 'cream'], 68, 28, 4, 7, 2.8, 42, 36, 48, false, true, 'A tall, breathable hamper made for island homes.'],
  ['Muri Picnic Tote', 'Basketry', ['pandanus', 'cotton'], ['coastal', 'giftable', 'wearable'], ['natural', 'coral'], 49, 19, 7, 4.2, 1.2, 36, 20, 24, false, true, 'A handwoven tote with room for fruit, a towel, and a good book.'],
  ['Shell-Edged Catchall', 'Basketry', ['pandanus', 'shell'], ['coastal', 'giftable', 'home'], ['sand', 'pearl'], 21, 7, 18, 1.3, 0.34, 18, 18, 6, false, true, 'A small catchall edged with shell chips gathered along the reef.'],
  ['Avarua Market Caddy', 'Basketry', ['pandanus', 'coconut fibre'], ['home', 'island-made'], ['natural', 'deep ocean'], 52, 21, 6, 4.8, 1.5, 39, 28, 19, false, true, 'A compact caddy that keeps market-day essentials together.'],
  ['Low Tide Bread Basket', 'Basketry', ['pandanus', 'hibiscus fibre'], ['home', 'coastal'], ['cream', 'coral'], 34, 12, 11, 2.5, 0.9, 30, 24, 11, false, true, 'A low woven basket that makes a table feel ready for sharing.'],
  ['Motu Wall Pocket', 'Basketry', ['pandanus', 'cotton cord'], ['home', 'island-made'], ['natural', 'ink'], 31, 11, 12, 2.1, 0.6, 27, 15, 20, false, true, 'A wall pocket for letters, small tools, or a bit of dried greenery.'],
  ['Deep Cove Serving Bowl', 'Basketry', ['pandanus', 'coir'], ['home', 'statement'], ['deep ocean', 'natural'], 47, 18, 7, 3.9, 1.4, 34, 34, 14, false, true, 'A generous woven bowl with a deep, graphic stripe.'],
  ['Tiare Carved Spoon', 'Woodwork', ['tamanu wood'], ['home', 'giftable', 'island-made'], ['natural', 'walnut'], 23, 7, 18, 1.6, 0.18, 22, 5, 3, false, true, 'A smooth serving spoon carved from richly grained tamanu wood.'],
  ['Vaka Paddle Miniature', 'Woodwork', ['breadfruit wood'], ['coastal', 'giftable', 'statement'], ['walnut', 'sand'], 34, 12, 10, 2.8, 0.65, 32, 8, 4, false, false, 'A small study of a traditional paddle, shaped as a keepsake.'],
  ['Bird of the Pass Carving', 'Woodwork', ['hibiscus wood'], ['island-made', 'statement'], ['natural', 'ink'], 42, 16, 8, 4.2, 1.1, 28, 13, 19, false, false, 'A stylized bird with a broad wing and a soft hand-sanded finish.'],
  ['Palm Leaf Bookend', 'Woodwork', ['tamanu wood'], ['home', 'island-made'], ['walnut', 'natural'], 36, 13, 9, 3.6, 1.4, 28, 10, 18, false, false, 'A weighty bookend with a palm-leaf silhouette.'],
  ['Reef Passage Box', 'Woodwork', ['breadfruit wood', 'brass'], ['home', 'giftable'], ['walnut', 'brass'], 48, 18, 5, 4.5, 1.6, 29, 20, 12, false, true, 'A lidded box for letters, keepsakes, and the little things worth keeping.'],
  ['Carved Wave Coaster Set', 'Woodwork', ['tamanu wood'], ['coastal', 'home', 'giftable'], ['natural', 'deep ocean'], 27, 8, 12, 2.1, 0.45, 17, 17, 4, false, true, 'Four coasters carved with a repeating wave line.'],
  ['Muri Hook Pair', 'Woodwork', ['breadfruit wood'], ['home', 'island-made'], ['natural', 'coral'], 19, 6, 20, 1.4, 0.22, 16, 8, 5, false, true, 'A pair of small wall hooks for hats, keys, or a woven bag.'],
  ['Island Story Totem', 'Woodwork', ['hibiscus wood'], ['statement', 'island-made'], ['walnut', 'cream'], 63, 25, 5, 7, 2.6, 37, 13, 13, false, false, 'A vertical carved story with three quiet coastal marks.'],
  ['Ridge Line Desk Stand', 'Woodwork', ['tamanu wood', 'brass'], ['home', 'giftable'], ['walnut', 'brass'], 33, 12, 13, 3, 0.7, 24, 11, 8, false, true, 'A small stand for a phone, recipe card, or favorite postcard.'],
  ['Sea Grape Bowl', 'Woodwork', ['breadfruit wood'], ['home', 'coastal'], ['natural', 'ink'], 41, 15, 9, 3.8, 1.25, 31, 31, 10, false, true, 'A round bowl with a softly uneven rim and a satin finish.'],
  ['Cove Cotton Wrap', 'Textiles', ['cotton', 'linen'], ['wearable', 'lightweight', 'coastal'], ['cream', 'teal'], 40, 15, 11, 2.8, 0.28, 29, 19, 5, false, true, 'A light wrap for breezy evenings and open-air markets.'],
  ['Muri Blue Bandana', 'Textiles', ['cotton'], ['wearable', 'giftable', 'lightweight'], ['lagoon', 'cream'], 17, 5, 24, 1.1, 0.12, 18, 16, 2, false, true, 'A small square of color with a hand-printed wave border.'],
  ['Pandanus Check Runner', 'Textiles', ['cotton', 'pandanus fibre'], ['home', 'island-made'], ['sand', 'deep ocean'], 52, 19, 7, 4.4, 0.4, 34, 15, 6, false, true, 'A table runner with the rhythm of a hand-drawn tide chart.'],
  ['Night Ferry Cushion', 'Textiles', ['linen', 'cotton'], ['home', 'coastal'], ['ink', 'coral'], 46, 17, 8, 3.6, 0.55, 34, 34, 11, false, true, 'A soft square cushion in a deep ink stripe with coral stitching.'],
  ['Island Morning Tea Towel', 'Textiles', ['linen'], ['home', 'giftable', 'lightweight'], ['cream', 'aqua'], 15, 4, 28, 0.8, 0.11, 23, 16, 2, false, true, 'A linen tea towel with a quiet, screen-printed island mark.'],
  ['Reef Stripe Table Cloth', 'Textiles', ['linen', 'cotton'], ['home', 'statement'], ['sand', 'teal'], 74, 28, 5, 6.5, 0.7, 41, 27, 8, false, true, 'A generous table cloth woven for long lunches and open windows.'],
  ['Motu Travel Pouch', 'Textiles', ['cotton canvas', 'brass'], ['wearable', 'giftable'], ['coral', 'cream'], 29, 10, 16, 1.8, 0.2, 24, 16, 5, false, true, 'A small zip pouch with a brass pull and a lined cotton interior.'],
  ['Salt Air Headband', 'Textiles', ['cotton', 'linen'], ['wearable', 'lightweight'], ['lagoon', 'coral'], 13, 3.5, 25, 0.6, 0.06, 18, 8, 3, false, true, 'A soft headband in a bright, easy-to-wear island print.'],
  ['Aroa Indigo Shawl', 'Textiles', ['cotton', 'linen'], ['wearable', 'statement', 'coastal'], ['indigo', 'cream'], 68, 25, 6, 5.3, 0.46, 35, 23, 7, false, true, 'A light shawl with a hand-dyed indigo edge.'],
  ['Lagoon Ledger Print', 'Prints', ['archival paper', 'vegetable ink'], ['coastal', 'giftable', 'lightweight'], ['teal', 'cream'], 24, 7, 20, 1.2, 0.15, 27, 20, 2, false, true, 'A graphic print mapping an imagined tide between island and gateway.'],
  ['Coconut Grove Study', 'Prints', ['archival paper', 'vegetable ink'], ['home', 'giftable', 'lightweight'], ['ink', 'sand'], 22, 6, 21, 1.1, 0.14, 27, 20, 2, false, true, 'A quiet line study of palms in the hour before the heat.'],
  ['Three Boats at Dawn', 'Prints', ['archival paper', 'vegetable ink'], ['coastal', 'home', 'lightweight'], ['coral', 'cream'], 29, 8, 17, 1.4, 0.16, 30, 22, 2, false, true, 'Three small boats, three tones of water, one calm morning.'],
  ['Muri Shoreline Poster', 'Prints', ['archival paper', 'vegetable ink'], ['coastal', 'statement'], ['deep ocean', 'aqua'], 34, 10, 12, 1.8, 0.24, 38, 28, 2, false, true, 'A larger-format shoreline print with a strong horizon line.'],
  ['Made Together Mini Print', 'Prints', ['archival paper', 'vegetable ink'], ['giftable', 'lightweight', 'island-made'], ['coral', 'teal'], 18, 5, 23, 0.9, 0.12, 22, 16, 2, false, true, 'A small reminder that an island shipment is stronger together.'],
  ['Salt Glaze Breakfast Plate', 'Ceramics', ['stoneware clay', 'salt glaze'], ['home', 'coastal'], ['cream', 'lagoon'], 31, 12, 8, 3.1, 0.9, 28, 28, 5, true, true, 'A hand-thrown breakfast plate with a pale salt-glaze edge.'],
  ['Muri Tide Serving Dish', 'Ceramics', ['stoneware clay'], ['home', 'giftable'], ['teal', 'cream'], 36, 14, 9, 3.4, 1.1, 31, 22, 8, true, true, 'A long serving dish for citrus, bread, or whatever arrives from the garden.'],
  ['Cove Pinch Pot', 'Ceramics', ['stoneware clay'], ['home', 'giftable', 'lightweight'], ['coral', 'sand'], 19, 7, 14, 2.2, 0.4, 16, 16, 9, true, true, 'A small hand-pinched pot with a warm coral wash.'],
  ['Blue Current Tumbler', 'Ceramics', ['stoneware clay', 'salt glaze'], ['home', 'coastal'], ['deep ocean', 'cream'], 28, 10, 12, 2.8, 0.7, 19, 19, 14, true, true, 'A tactile tumbler made to feel good in the hand.'],
  ['Reef Rim Serving Bowl', 'Ceramics', ['stoneware clay', 'salt glaze'], ['home', 'statement'], ['lagoon', 'natural'], 56, 22, 6, 5, 2.4, 36, 36, 14, true, true, 'A broad serving bowl with a dark rim and a generous interior.'],
  ['Ash Tide Candle Vessel', 'Ceramics', ['stoneware clay'], ['home', 'giftable'], ['ash', 'coral'], 33, 12, 9, 3.2, 0.9, 20, 20, 16, true, false, 'A low candle vessel with a matte ash body and bright interior.'],
  ['Avarua Clay Pitcher', 'Ceramics', ['stoneware clay', 'salt glaze'], ['home', 'statement'], ['cream', 'aqua'], 62, 24, 5, 5.8, 2.8, 33, 24, 25, true, false, 'A tall pitcher with a generous handle and a soft blue glaze.'],
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const GENERATED_PRODUCTS: ProductBlueprint[] = GENERATED_BLUEPRINTS.map((row, index) => {
  const [name, category, materials, tags, colors, priceUsd, unitCostUsd, inventory, productionHours, weightKg, lengthCm, widthCm, heightCm, fragile, stackable, description] = row;
  return {
    slug: `${slugify(String(name))}-${index + 1}`,
    name: String(name),
    description: String(description),
    category: category as ProductCategory,
    tags: tags as string[],
    materials: materials as string[],
    colors: colors as string[],
    priceUsd: Number(priceUsd),
    unitCostUsd: Number(unitCostUsd),
    inventory: Number(inventory),
    productionHours: Number(productionHours),
    weightKg: Number(weightKg),
    lengthCm: Number(lengthCm),
    widthCm: Number(widthCm),
    heightCm: Number(heightCm),
    fragile: Boolean(fragile),
    stackable: Boolean(stackable),
    active: true,
  };
});

export const DEMO_PRODUCTS: Product[] = [...ANCHOR_PRODUCTS, ...GENERATED_PRODUCTS].slice(0, 60).map((product, index) => ({
  ...product,
  id: `product-${String(index + 1).padStart(3, '0')}`,
  sellerId: index < 8 ? ['seller-01', 'seller-04', 'seller-04', 'seller-02', 'seller-03', 'seller-01', 'seller-02', 'seller-06'][index] : `seller-${String((index % 15) + 1).padStart(2, '0')}`,
  imageUrl: PRODUCT_PHOTOS[index % PRODUCT_PHOTOS.length],
}));

export const DEMO_CARTONS: CartonProfile[] = [
  { code: 'XS', innerLengthCm: 15, innerWidthCm: 10, innerHeightCm: 6, maxWeightKg: 1, packagingWeightKg: 0.08, packagingCostUsd: 0.45 },
  { code: 'S', innerLengthCm: 25, innerWidthCm: 18, innerHeightCm: 10, maxWeightKg: 3, packagingWeightKg: 0.18, packagingCostUsd: 0.8 },
  { code: 'M', innerLengthCm: 35, innerWidthCm: 25, innerHeightCm: 18, maxWeightKg: 8, packagingWeightKg: 0.35, packagingCostUsd: 1.5 },
  { code: 'L', innerLengthCm: 45, innerWidthCm: 35, innerHeightCm: 28, maxWeightKg: 15, packagingWeightKg: 0.6, packagingCostUsd: 2.5 },
];

export const DEMO_PORTS = [
  { id: 'port-avatiu', name: 'Avatiu Harbour', countryCode: 'CK', latitude: -21.205, longitude: -159.776, source: 'seeded', sourceExternalId: 'CK-AVT' },
  { id: 'port-auckland', name: 'Auckland Gateway', countryCode: 'NZ', latitude: -36.842, longitude: 174.766, source: 'seeded', sourceExternalId: 'NZ-AKL' },
];

const HUB: GeoPoint = { latitude: -21.205, longitude: -159.776, label: 'Island consolidation hub' };

function addDaysAtHour(base: Date, days: number, hour: number): string {
  const value = new Date(base);
  value.setDate(value.getDate() + days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
}

export function getDemoDepartures(now = new Date()): Departure[] {
  const departureA = addDaysAtHour(now, 2, 9);
  const departureB = addDaysAtHour(now, 4, 9);
  const departureC = addDaysAtHour(now, 6, 9);
  const toCutoff = (departure: string) => new Date(new Date(departure).getTime() - 18 * 60 * 60 * 1000).toISOString();
  const toArrival = (departure: string, days: number) => new Date(new Date(departure).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
  const gateway: GeoPoint = { latitude: -36.842, longitude: 174.766, label: 'Auckland gateway' };
  return [
    {
      id: 'departure-reef-early',
      label: 'Early Reef Run',
      originPortId: 'port-avatiu',
      gatewayPortId: 'port-auckland',
      departureAt: departureA,
      arrivalAt: toArrival(departureA, 5),
      cutoffAt: toCutoff(departureA),
      maxWeightKg: 180,
      maxVolumeM3: 1.1,
      fixedCostUsd: 84,
      variableCostPerKg: 0.18,
      variableCostPerM3: 24,
      destinationZone: 'US-WEST',
      status: 'open',
      routePoints: [HUB, { latitude: -22.2, longitude: -130.6, label: 'Mid-ocean waypoint' }, gateway],
      weatherRisk: 0.56,
      weatherLabel: 'MODERATE',
    },
    {
      id: 'departure-west-friday',
      label: 'Friday West Coast Batch',
      originPortId: 'port-avatiu',
      gatewayPortId: 'port-auckland',
      departureAt: departureB,
      arrivalAt: toArrival(departureB, 5),
      cutoffAt: toCutoff(departureB),
      maxWeightKg: 190,
      maxVolumeM3: 1.15,
      fixedCostUsd: 88,
      variableCostPerKg: 0.19,
      variableCostPerM3: 24,
      destinationZone: 'US-WEST',
      status: 'open',
      routePoints: [HUB, { latitude: -24.7, longitude: -145.1, label: 'Mid-ocean waypoint' }, gateway],
      weatherRisk: 0.08,
      weatherLabel: 'LOW',
    },
    {
      id: 'departure-south-pacific',
      label: 'South Pacific Consolidation',
      originPortId: 'port-avatiu',
      gatewayPortId: 'port-auckland',
      departureAt: departureC,
      arrivalAt: toArrival(departureC, 6),
      cutoffAt: toCutoff(departureC),
      maxWeightKg: 210,
      maxVolumeM3: 1.2,
      fixedCostUsd: 105,
      variableCostPerKg: 0.2,
      variableCostPerM3: 25,
      destinationZone: 'US-WEST',
      status: 'open',
      routePoints: [HUB, { latitude: -28.1, longitude: -150.3, label: 'Mid-ocean waypoint' }, gateway],
      weatherRisk: 0.22,
      weatherLabel: 'LOW',
    },
  ];
}

export function getDemoBatchSnapshot(now = new Date()): BatchSnapshot {
  const departures = getDemoDepartures(now);
  const chosen = departures[1];
  return {
    id: 'batch-friday-west-coast',
    departureId: chosen.id,
    destinationZone: chosen.destinationZone,
    currentWeightKg: 56.8,
    currentVolumeM3: 0.943,
    orderCount: 18,
    participatingSellerIds: ['seller-01', 'seller-02', 'seller-03', 'seller-04', 'seller-05', 'seller-06', 'seller-07'],
    weatherRisk: chosen.weatherRisk,
    weatherLabel: chosen.weatherLabel,
    estimatedLocalPickupCostUsd: 42.8,
    predictedTotalLogisticsCostUsd: 326.4,
  };
}

export function getProductById(productId: string): Product | undefined {
  return DEMO_PRODUCTS.find((product) => product.id === productId);
}

export function getProductBySlug(slug: string): Product | undefined {
  return DEMO_PRODUCTS.find((product) => product.slug === slug);
}

export function getSellerById(sellerId: string): Seller | undefined {
  return DEMO_SELLERS.find((seller) => seller.id === sellerId);
}

export function getSellerProducts(sellerId: string): Product[] {
  return DEMO_PRODUCTS.filter((product) => product.sellerId === sellerId);
}

export function getDemoMarketSignals(): Array<{
  countryCode: string;
  countryName: string;
  tradeDemand: number;
  digitalAccess: number;
  purchasingPower: number;
  existingMarketplaceDemand: number;
  batchAvailability: number;
}> {
  return [
    { countryCode: 'US', countryName: 'United States', tradeDemand: 0.92, digitalAccess: 0.95, purchasingPower: 0.91, existingMarketplaceDemand: 0.82, batchAvailability: 0.88 },
    { countryCode: 'AU', countryName: 'Australia', tradeDemand: 0.84, digitalAccess: 0.93, purchasingPower: 0.87, existingMarketplaceDemand: 0.74, batchAvailability: 0.91 },
    { countryCode: 'JP', countryName: 'Japan', tradeDemand: 0.78, digitalAccess: 0.94, purchasingPower: 0.86, existingMarketplaceDemand: 0.63, batchAvailability: 0.69 },
    { countryCode: 'CA', countryName: 'Canada', tradeDemand: 0.76, digitalAccess: 0.92, purchasingPower: 0.84, existingMarketplaceDemand: 0.58, batchAvailability: 0.65 },
    { countryCode: 'NZ', countryName: 'New Zealand', tradeDemand: 0.66, digitalAccess: 0.91, purchasingPower: 0.79, existingMarketplaceDemand: 0.61, batchAvailability: 0.86 },
  ];
}

export function getDemoHistoricalEventCount(): number {
  return 150;
}

export function getDefaultSeller(): Seller {
  return DEMO_SELLERS[0];
}

export const DEMO_MARKETPLACE_LABEL = 'DEMO MARKETPLACE DATA';
