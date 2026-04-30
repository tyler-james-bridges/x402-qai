import { NextRequest, NextResponse } from 'next/server';

const WEEDMAPS_DISCOVERY = 'https://api-g.weedmaps.com/discovery/v2/listings';
const WEEDMAPS_MENU = 'https://api-g.weedmaps.com/wm/v1/listings';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface WmListing {
  name: string;
  wmid: number;
  city: string;
  address: string;
  type: string;
  rating: number;
  reviews_count: number;
  web_url: string;
}

interface WmMenuItem {
  attributes: {
    name: string;
    category_name: string;
    brand_name: string;
    genetics: string;
    online_orderable: boolean;
    prices: {
      price_unit: number;
      price_half_gram: number;
      price_gram: number;
      price_eighth: number;
      price_quarter: number;
      price_half_ounce: number;
      price_ounce: number;
    };
  };
}

const CATEGORY_MAP: Record<string, string[]> = {
  flower: ['flower'],
  edibles: ['edibles'],
  edible: ['edibles'],
  vape: ['vape pens'],
  vapes: ['vape pens'],
  'vape pens': ['vape pens'],
  cartridge: ['vape pens'],
  concentrate: ['concentrates'],
  concentrates: ['concentrates'],
  dab: ['concentrates'],
  'pre-roll': ['pre-rolls'],
  'pre-rolls': ['pre-rolls'],
  preroll: ['pre-rolls'],
  prerolls: ['pre-rolls'],
  joint: ['pre-rolls'],
  drink: ['drinks'],
  drinks: ['drinks'],
  beverage: ['drinks'],
  tincture: ['tinctures'],
  tinctures: ['tinctures'],
  topical: ['topicals'],
  topicals: ['topicals'],
};

type PriceUnit = 'unit' | 'gram' | 'eighth' | 'quarter' | 'half_ounce' | 'ounce';

const PRICE_KEYS: Record<PriceUnit, keyof WmMenuItem['attributes']['prices']> = {
  unit: 'price_unit',
  gram: 'price_gram',
  eighth: 'price_eighth',
  quarter: 'price_quarter',
  half_ounce: 'price_half_ounce',
  ounce: 'price_ounce',
};

async function geocode(
  location: string,
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const latLng = location.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (latLng) {
    return { lat: parseFloat(latLng[1]), lng: parseFloat(latLng[2]), display_name: location };
  }
  try {
    const params = new URLSearchParams({
      q: location,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    });
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { 'User-Agent': 'x402-price-compare/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GeoResult[];
    if (!data.length) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      display_name: data[0].display_name,
    };
  } catch {
    return null;
  }
}

async function findDispensaries(
  lat: number,
  lng: number,
  radius: string,
): Promise<WmListing[]> {
  const params = new URLSearchParams({
    'filter[bounding_latlng]': `${lat},${lng}`,
    'filter[bounding_radius]': radius,
    page_size: '15',
  });
  try {
    const res = await fetch(`${WEEDMAPS_DISCOVERY}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { listings?: WmListing[] } };
    return data.data?.listings ?? [];
  } catch {
    return [];
  }
}

async function fetchMenu(wmid: number): Promise<WmMenuItem[]> {
  try {
    const res = await fetch(`${WEEDMAPS_MENU}/${wmid}/menu_items?page_size=20`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: WmMenuItem[] };
    return (data.data ?? []).filter(
      (i) =>
        !['gear', 'accessories', 'apparel'].includes(
          i.attributes.category_name?.toLowerCase() ?? '',
        ),
    );
  } catch {
    return [];
  }
}

function getPrice(
  prices: WmMenuItem['attributes']['prices'],
  preferredUnit: PriceUnit | null,
): { price: number; unitLabel: string } {
  if (!prices) return { price: 0, unitLabel: 'unknown' };
  if (preferredUnit && PRICE_KEYS[preferredUnit]) {
    const val = prices[PRICE_KEYS[preferredUnit]];
    if (val > 0) return { price: val, unitLabel: preferredUnit };
  }
  if (prices.price_unit > 0) return { price: prices.price_unit, unitLabel: 'unit' };
  if (prices.price_eighth > 0) return { price: prices.price_eighth, unitLabel: 'eighth' };
  if (prices.price_gram > 0) return { price: prices.price_gram, unitLabel: 'gram' };
  if (prices.price_quarter > 0) return { price: prices.price_quarter, unitLabel: 'quarter' };
  if (prices.price_half_ounce > 0) return { price: prices.price_half_ounce, unitLabel: 'half_ounce' };
  if (prices.price_ounce > 0) return { price: prices.price_ounce, unitLabel: 'ounce' };
  return { price: 0, unitLabel: 'unknown' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const categoryInput = body.category?.trim().toLowerCase();
    const location = body.location?.trim();

    if (!categoryInput) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing 'category'. Options: flower, edibles, vape, concentrates, pre-rolls, drinks, tinctures, topicals",
        },
        { status: 400 },
      );
    }
    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing 'location'" }, { status: 400 });
    }

    const targetCategories = CATEGORY_MAP[categoryInput];
    if (!targetCategories) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown category: ${categoryInput}. Options: flower, edibles, vape, concentrates, pre-rolls, drinks, tinctures, topicals`,
        },
        { status: 400 },
      );
    }

    const radius = body.radius?.trim() ?? '10mi';
    const genetics = body.genetics?.trim().toLowerCase() ?? null;
    const unit = (body.unit?.trim().toLowerCase() ?? null) as PriceUnit | null;
    const limit = Math.min(body.limit ?? 20, 50);

    const geo = await geocode(location);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: `Could not geocode: ${location}` },
        { status: 400 },
      );
    }

    const dispensaries = await findDispensaries(geo.lat, geo.lng, radius);
    const results: Array<{
      name: string;
      brand: string;
      genetics: string;
      price: number;
      unit: string;
      dispensary: string;
      dispensary_rating: number;
      dispensary_url: string;
      orderable: boolean;
    }> = [];

    for (const disp of dispensaries) {
      const menu = await fetchMenu(disp.wmid);
      for (const item of menu) {
        const cat = item.attributes.category_name?.toLowerCase() ?? '';
        if (!targetCategories.some((c) => cat.includes(c))) continue;
        if (genetics) {
          const gen = item.attributes.genetics?.toLowerCase() ?? '';
          if (gen !== genetics) continue;
        }
        const { price, unitLabel } = getPrice(item.attributes.prices, unit);
        if (price <= 0) continue;
        results.push({
          name: item.attributes.name,
          brand: item.attributes.brand_name || 'Unknown',
          genetics: item.attributes.genetics || 'unknown',
          price,
          unit: unitLabel,
          dispensary: disp.name,
          dispensary_rating: disp.rating,
          dispensary_url: disp.web_url,
          orderable: item.attributes.online_orderable,
        });
      }
    }

    results.sort((a, b) => a.price - b.price);
    const trimmed = results.slice(0, limit);

    const prices = results.map((r) => r.price);
    const min = prices.length > 0 ? Math.min(...prices) : 0;
    const max = prices.length > 0 ? Math.max(...prices) : 0;
    const avg =
      prices.length > 0
        ? Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100
        : 0;

    let summary = `Compared ${results.length} ${categoryInput}${genetics ? ` (${genetics})` : ''} products across ${dispensaries.length} dispensaries near ${location}.`;
    if (results.length === 0) {
      summary += ' No matching products found.';
    } else {
      summary += ` Cheapest: $${min}${trimmed[0] ? ` (${trimmed[0].name} at ${trimmed[0].dispensary})` : ''}. Most expensive: $${max}. Average: $${avg}.`;
    }

    return NextResponse.json({
      ok: true,
      category: categoryInput,
      unit: unit || 'best available',
      genetics: genetics || 'all',
      location: { query: location, lat: geo.lat, lng: geo.lng, resolved: geo.display_name },
      dispensaries_searched: dispensaries.length,
      total_matches: results.length,
      results: trimmed,
      stats: { min, max, avg, count: results.length },
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
