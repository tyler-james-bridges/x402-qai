import { NextRequest, NextResponse } from 'next/server';

const WEEDMAPS_DISCOVERY = 'https://api-g.weedmaps.com/discovery/v2/listings';
const WEEDMAPS_MENU = 'https://weedmaps.com/api/v1/listings';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';

interface GeoResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface WmListing {
  id: number;
  name: string;
  slug: string;
  wmid: number;
  city: string;
  state: string;
  address: string;
  type: string;
  rating: number;
  reviews_count: number;
  web_url: string;
  has_sale_items: boolean;
  license_type: string;
  latitude: number;
  longitude: number;
}

interface WmMenuItem {
  id: number;
  attributes: {
    name: string;
    category_name: string;
    brand_name: string;
    genetics: string;
    body: string;
    online_orderable: boolean;
    picture_url: string;
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

async function geocode(
  location: string,
): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const latLng = location.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (latLng) {
    return {
      lat: parseFloat(latLng[1]),
      lng: parseFloat(latLng[2]),
      display_name: location,
    };
  }

  try {
    const params = new URLSearchParams({
      q: location,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
    });
    const res = await fetch(`${NOMINATIM}?${params}`, {
      headers: { 'User-Agent': 'x402-weedmaps-recs/1.0' },
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
  type: string,
): Promise<WmListing[]> {
  const params = new URLSearchParams({
    'filter[bounding_latlng]': `${lat},${lng}`,
    'filter[bounding_radius]': radius,
    page_size: '20',
  });
  if (type !== 'all') {
    params.set('filter[type]', type);
  }

  try {
    const res = await fetch(`${WEEDMAPS_DISCOVERY}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { listings?: WmListing[] };
    };
    return (data.data?.listings ?? []).sort(
      (a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count,
    );
  } catch {
    return [];
  }
}

async function fetchMenu(wmid: number): Promise<WmMenuItem[]> {
  try {
    const res = await fetch(`${WEEDMAPS_MENU}/${wmid}/menu_items?page_size=20`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: WmMenuItem[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

function filterProducts(items: WmMenuItem[], query: string): WmMenuItem[] {
  if (!query) return items;

  const terms = query.toLowerCase().split(/\s+/);
  const categoryMap: Record<string, string[]> = {
    edible: ['edibles'],
    edibles: ['edibles'],
    flower: ['flower'],
    bud: ['flower'],
    vape: ['vape pens'],
    vapes: ['vape pens'],
    pen: ['vape pens'],
    pens: ['vape pens'],
    cart: ['vape pens'],
    cartridge: ['vape pens'],
    drink: ['drinks'],
    drinks: ['drinks'],
    beverage: ['drinks'],
    preroll: ['pre-rolls'],
    'pre-roll': ['pre-rolls'],
    joint: ['pre-rolls'],
    concentrate: ['concentrates'],
    dab: ['concentrates'],
    wax: ['concentrates'],
    topical: ['topicals'],
    cream: ['topicals'],
    tincture: ['tinctures'],
  };

  const geneticsMap: Record<string, string> = {
    indica: 'indica',
    sativa: 'sativa',
    hybrid: 'hybrid',
    sleep: 'indica',
    relax: 'indica',
    chill: 'indica',
    energy: 'sativa',
    focus: 'sativa',
    creative: 'sativa',
    balanced: 'hybrid',
  };

  const targetCategories: string[] = [];
  let targetGenetics: string | null = null;
  const textTerms: string[] = [];

  for (const term of terms) {
    if (categoryMap[term]) {
      targetCategories.push(...categoryMap[term]);
    } else if (geneticsMap[term]) {
      targetGenetics = geneticsMap[term];
    } else if (
      !['for', 'the', 'a', 'an', 'some', 'best', 'good', 'cheap', 'strong', 'strongest'].includes(
        term,
      )
    ) {
      textTerms.push(term);
    }
  }

  const scored = items.map((item) => {
    let score = 0;
    const cat = item.attributes.category_name?.toLowerCase() ?? '';
    const gen = item.attributes.genetics?.toLowerCase() ?? '';
    const name = item.attributes.name?.toLowerCase() ?? '';
    const brand = item.attributes.brand_name?.toLowerCase() ?? '';
    const desc = item.attributes.body?.toLowerCase() ?? '';

    if (targetCategories.length > 0) {
      if (targetCategories.some((c) => cat.includes(c))) score += 10;
      else score -= 5;
    }

    if (targetGenetics) {
      if (gen === targetGenetics) score += 8;
      else if (gen === 'hybrid') score += 2;
    }

    for (const t of textTerms) {
      if (name.includes(t)) score += 5;
      if (brand.includes(t)) score += 3;
      if (desc.includes(t)) score += 1;
    }

    if (query.includes('cheap') || query.includes('budget')) {
      const price = bestPrice(item.attributes.prices);
      if (price > 0 && price <= 15) score += 5;
      else if (price > 0 && price <= 25) score += 2;
    }

    if (query.includes('strong') || query.includes('strongest')) {
      const thcMatch = desc.match(/(\d+)\s*mg/);
      if (thcMatch && parseInt(thcMatch[1]) >= 100) score += 5;
    }

    return { item, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((s) => s.score > 0 || !query)
    .map((s) => s.item);
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

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const location = body.location?.trim();

    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing 'location'" }, { status: 400 });
    }

    const query = body.query?.trim() ?? '';
    const radius = body.radius?.trim() ?? '10mi';
    const listingType = body.type?.trim() ?? 'all';

    const geo = await geocode(location);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: `Could not geocode location: ${location}` },
        { status: 400 },
      );
    }

    const dispensaries = await findDispensaries(geo.lat, geo.lng, radius, listingType);

    if (dispensaries.length === 0) {
      return NextResponse.json({
        ok: true,
        location: { query: location, lat: geo.lat, lng: geo.lng },
        dispensaries: [],
        summary: 'No dispensaries found near this location.',
      });
    }

    const top = dispensaries.slice(0, 5);
    const results = [];

    for (const disp of top) {
      const menuItems = await fetchMenu(disp.wmid);
      const filtered = filterProducts(menuItems, query);
      const recs = filtered.slice(0, 5).map((item) => ({
        name: item.attributes.name,
        category: item.attributes.category_name,
        brand: item.attributes.brand_name || 'Unknown',
        genetics: item.attributes.genetics || 'unknown',
        price: bestPrice(item.attributes.prices),
        description: stripHtml(item.attributes.body).slice(0, 200),
        orderable: item.attributes.online_orderable,
        picture: item.attributes.picture_url || null,
      }));

      results.push({
        name: disp.name,
        rating: disp.rating,
        reviews: disp.reviews_count,
        type: disp.type,
        address: disp.address,
        city: disp.city,
        state: disp.state,
        has_deals: disp.has_sale_items,
        license: disp.license_type,
        url: disp.web_url,
        recommendations: recs,
      });
    }

    const total = results.reduce((sum, d) => sum + d.recommendations.length, 0);
    const topDisp = results[0];
    let summary = `Found ${total} recommendations across ${results.length} dispensaries near ${location}.`;
    if (topDisp) {
      summary += ` Top pick: ${topDisp.name} (${topDisp.rating} stars).`;
      if (topDisp.recommendations.length > 0) {
        const rec = topDisp.recommendations[0];
        summary += ` Try: ${rec.name} (${rec.category}${rec.price > 0 ? `, $${rec.price}` : ''}).`;
      }
    }

    return NextResponse.json({
      ok: true,
      location: {
        query: location,
        lat: geo.lat,
        lng: geo.lng,
        resolved: geo.display_name,
      },
      dispensaries: results,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
