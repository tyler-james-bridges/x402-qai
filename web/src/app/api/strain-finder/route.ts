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
  slug: string;
  wmid: number;
  city: string;
  state: string;
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
    body: string;
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
      headers: { 'User-Agent': 'x402-strain-finder/1.0' },
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
    page_size: '15',
  });
  if (type !== 'all') params.set('filter[type]', type);
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
    const strain = body.strain?.trim();
    const location = body.location?.trim();

    if (!strain) {
      return NextResponse.json({ ok: false, error: "Missing 'strain'" }, { status: 400 });
    }
    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing 'location'" }, { status: 400 });
    }

    const radius = body.radius?.trim() ?? '10mi';
    const listingType = body.type?.trim() ?? 'all';

    const geo = await geocode(location);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: `Could not geocode: ${location}` },
        { status: 400 },
      );
    }

    const dispensaries = await findDispensaries(geo.lat, geo.lng, radius, listingType);
    const strainLower = strain.toLowerCase();
    const results = [];

    for (const disp of dispensaries) {
      const menu = await fetchMenu(disp.wmid);
      const matches = menu.filter((item) => {
        const name = item.attributes.name?.toLowerCase() ?? '';
        return name.includes(strainLower);
      });

      if (matches.length > 0) {
        results.push({
          dispensary: disp.name,
          rating: disp.rating,
          reviews: disp.reviews_count,
          type: disp.type,
          address: disp.address,
          city: disp.city,
          url: disp.web_url,
          matches: matches.map((m) => ({
            name: m.attributes.name,
            category: m.attributes.category_name,
            brand: m.attributes.brand_name || 'Unknown',
            genetics: m.attributes.genetics || 'unknown',
            price: bestPrice(m.attributes.prices),
            orderable: m.attributes.online_orderable,
          })),
        });
      }
    }

    results.sort((a, b) => {
      const aMin = Math.min(...a.matches.map((m) => m.price || Infinity));
      const bMin = Math.min(...b.matches.map((m) => m.price || Infinity));
      return aMin - bMin;
    });

    const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);
    const cheapest = results[0]?.matches.sort(
      (a, b) => (a.price || Infinity) - (b.price || Infinity),
    )[0];

    let summary = `Searched featured menus at ${dispensaries.length} dispensaries near ${location} for "${strain}". `;
    if (results.length === 0) {
      summary += 'No matches found.';
    } else {
      summary += `Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'} at ${results.length} dispensar${results.length === 1 ? 'y' : 'ies'}.`;
      if (cheapest && cheapest.price > 0) {
        summary += ` Cheapest: $${cheapest.price} at ${results[0].dispensary}.`;
      }
    }

    return NextResponse.json({
      ok: true,
      strain,
      location: { query: location, lat: geo.lat, lng: geo.lng, resolved: geo.display_name },
      dispensaries_searched: dispensaries.length,
      results,
      summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
