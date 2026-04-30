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
  has_sale_items: boolean;
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
  concentrate: ['concentrates'],
  concentrates: ['concentrates'],
  'pre-roll': ['pre-rolls'],
  'pre-rolls': ['pre-rolls'],
  preroll: ['pre-rolls'],
  drink: ['drinks'],
  drinks: ['drinks'],
  tincture: ['tinctures'],
  tinctures: ['tinctures'],
  topical: ['topicals'],
  topicals: ['topicals'],
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
      headers: { 'User-Agent': 'x402-deal-scout/1.0' },
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
  dealsOnly: boolean,
): Promise<WmListing[]> {
  const params = new URLSearchParams({
    'filter[bounding_latlng]': `${lat},${lng}`,
    'filter[bounding_radius]': radius,
    page_size: '20',
  });
  if (dealsOnly) {
    params.set('filter[has_sale_items]', 'true');
  }
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

function bestPrice(prices: WmMenuItem['attributes']['prices']): number {
  if (!prices) return 0;
  if (prices.price_unit > 0) return prices.price_unit;
  if (prices.price_eighth > 0) return prices.price_eighth;
  if (prices.price_gram > 0) return prices.price_gram;
  if (prices.price_quarter > 0) return prices.price_quarter;
  if (prices.price_half_ounce > 0) return prices.price_half_ounce;
  if (prices.price_ounce > 0) return prices.price_ounce;
  return 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const location = body.location?.trim();

    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing 'location'" }, { status: 400 });
    }

    const categoryInput = body.category?.trim().toLowerCase() ?? null;
    const radius = body.radius?.trim() ?? '10mi';

    const targetCategories = categoryInput ? CATEGORY_MAP[categoryInput] ?? null : null;
    if (categoryInput && !targetCategories) {
      return NextResponse.json(
        {
          ok: false,
          error: `Unknown category: ${categoryInput}. Options: flower, edibles, vape, concentrates, pre-rolls, drinks, tinctures, topicals`,
        },
        { status: 400 },
      );
    }

    const geo = await geocode(location);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: `Could not geocode: ${location}` },
        { status: 400 },
      );
    }

    const allDispensaries = await findDispensaries(geo.lat, geo.lng, radius, false);
    const dealDispensaries = await findDispensaries(geo.lat, geo.lng, radius, true);

    const results = [];

    for (const disp of dealDispensaries) {
      const menu = await fetchMenu(disp.wmid);

      let products = menu;
      if (targetCategories) {
        products = menu.filter((item) => {
          const cat = item.attributes.category_name?.toLowerCase() ?? '';
          return targetCategories.some((c) => cat.includes(c));
        });
      }

      const dealProducts = products.slice(0, 10).map((item) => ({
        name: item.attributes.name,
        category: item.attributes.category_name,
        brand: item.attributes.brand_name || 'Unknown',
        genetics: item.attributes.genetics || 'unknown',
        price: bestPrice(item.attributes.prices),
        orderable: item.attributes.online_orderable,
      }));

      results.push({
        dispensary: disp.name,
        rating: disp.rating,
        reviews: disp.reviews_count,
        type: disp.type,
        address: disp.address,
        city: disp.city,
        url: disp.web_url,
        deal_products: dealProducts,
      });
    }

    results.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);

    const totalProducts = results.reduce((sum, r) => sum + r.deal_products.length, 0);

    let summary = `${dealDispensaries.length} of ${allDispensaries.length} dispensaries near ${location} have active deals.`;
    if (categoryInput) {
      summary += ` Found ${totalProducts} ${categoryInput} products at deal dispensaries.`;
    } else {
      summary += ` Found ${totalProducts} products at deal dispensaries.`;
    }
    if (results[0] && results[0].deal_products[0]) {
      const best = results[0].deal_products.sort(
        (a, b) => (a.price || Infinity) - (b.price || Infinity),
      )[0];
      if (best.price > 0) {
        summary += ` Best value: ${best.name} at $${best.price} (${results[0].dispensary}).`;
      }
    }
    summary +=
      ' Note: These dispensaries are flagged as having active sales, but individual sale prices are not available through the public API.';

    return NextResponse.json({
      ok: true,
      location: { query: location, lat: geo.lat, lng: geo.lng, resolved: geo.display_name },
      category: categoryInput || 'all',
      total_dispensaries: allDispensaries.length,
      deals_dispensaries: dealDispensaries.length,
      results,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
