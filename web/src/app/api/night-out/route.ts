import { NextRequest, NextResponse } from 'next/server';

const WEEDMAPS_DISCOVERY = 'https://api-g.weedmaps.com/discovery/v2/listings';
const WEEDMAPS_MENU = 'https://api-g.weedmaps.com/wm/v1/listings';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';
const BREWERYDB = 'https://api.openbrewerydb.org/v1/breweries';

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
  has_sale_items: boolean;
  license_type: string;
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

interface OsmElement {
  tags: {
    name?: string;
    cuisine?: string;
    'addr:street'?: string;
    website?: string;
    opening_hours?: string;
  };
}

interface Brewery {
  name: string;
  brewery_type: string;
  street: string | null;
  city: string;
  website_url: string | null;
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
      headers: { 'User-Agent': 'x402-night-out/1.0' },
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

async function fetchDispensaries(lat: number, lng: number, radius: string) {
  try {
    const params = new URLSearchParams({
      'filter[bounding_latlng]': `${lat},${lng}`,
      'filter[bounding_radius]': radius,
      page_size: '10',
    });
    const res = await fetch(`${WEEDMAPS_DISCOVERY}?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: { listings?: WmListing[] } };
    const listings = (data.data?.listings ?? [])
      .sort((a, b) => b.rating - a.rating || b.reviews_count - a.reviews_count)
      .slice(0, 3);

    const results = [];
    for (const disp of listings) {
      let topPick: { name: string; category: string; price: number } | null = null;
      try {
        const menuRes = await fetch(`${WEEDMAPS_MENU}/${disp.wmid}/menu_items?page_size=10`, {
          signal: AbortSignal.timeout(10000),
        });
        if (menuRes.ok) {
          const menuData = (await menuRes.json()) as { data?: WmMenuItem[] };
          const items = menuData.data ?? [];
          if (items.length > 0) {
            const item = items[0];
            topPick = {
              name: item.attributes.name,
              category: item.attributes.category_name,
              price: bestPrice(item.attributes.prices),
            };
          }
        }
      } catch {
        // continue
      }
      results.push({
        name: disp.name,
        rating: disp.rating,
        reviews: disp.reviews_count,
        type: disp.type,
        address: disp.address,
        city: disp.city,
        url: disp.web_url,
        has_deals: disp.has_sale_items,
        topPick,
      });
    }
    return results;
  } catch {
    return [];
  }
}

function bestPrice(prices: WmMenuItem['attributes']['prices']): number {
  if (!prices) return 0;
  if (prices.price_unit > 0) return prices.price_unit;
  if (prices.price_eighth > 0) return prices.price_eighth;
  if (prices.price_gram > 0) return prices.price_gram;
  return 0;
}

async function fetchOsmPois(lat: number, lng: number, radiusM: number, amenity: string) {
  try {
    const query = `[out:json];node["amenity"="${amenity}"](around:${Math.min(radiusM, 10000)},${lat},${lng});out 10;`;
    const url = `${OVERPASS}?data=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'x402-night-out/1.0' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OsmElement[] };
    return (data.elements ?? [])
      .filter((e) => e.tags?.name)
      .slice(0, 10)
      .map((e) => ({
        name: e.tags.name!,
        cuisine: e.tags.cuisine ?? null,
        address: e.tags['addr:street'] ?? null,
        website: e.tags.website ?? null,
        hours: e.tags.opening_hours ?? null,
      }));
  } catch {
    return [];
  }
}

async function fetchBreweries(location: string) {
  try {
    const city = location
      .replace(/,?\s*(AZ|Arizona|CA|California|TX|Texas|US|USA)$/i, '')
      .trim()
      .split(',')[0]
      .trim();
    const res = await fetch(`${BREWERYDB}?by_city=${encodeURIComponent(city)}&per_page=5`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Brewery[];
    return data.map((b) => ({
      name: b.name,
      type: b.brewery_type,
      address: b.street,
      city: b.city,
      website: b.website_url,
    }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const location = body.location?.trim();
    if (!location) {
      return NextResponse.json({ ok: false, error: "Missing 'location'" }, { status: 400 });
    }

    const radiusMi = parseFloat(body.radius ?? '10') || 10;
    const radiusM = Math.round(radiusMi * 1609.34);

    const geo = await geocode(location);
    if (!geo) {
      return NextResponse.json(
        { ok: false, error: `Could not geocode: ${location}` },
        { status: 400 },
      );
    }

    const [dispensaries, bars, restaurants, breweries] = await Promise.all([
      fetchDispensaries(geo.lat, geo.lng, `${radiusMi}mi`),
      fetchOsmPois(geo.lat, geo.lng, radiusM, 'bar'),
      fetchOsmPois(geo.lat, geo.lng, radiusM, 'restaurant'),
      fetchBreweries(location),
    ]);

    const plan = { dispensaries, bars, restaurants, breweries };
    const total = dispensaries.length + bars.length + restaurants.length + breweries.length;

    const parts = [`Night out near ${location}:`];
    if (dispensaries[0]) {
      let s = `${dispensaries[0].name} (${dispensaries[0].rating} stars)`;
      if (dispensaries[0].topPick) s += ` - try ${dispensaries[0].topPick.name}`;
      parts.push(s);
    }
    if (restaurants[0]) parts.push(`Eat at ${restaurants[0].name}${restaurants[0].cuisine ? ` (${restaurants[0].cuisine})` : ''}`);
    if (bars[0]) parts.push(`Drinks at ${bars[0].name}`);
    else if (breweries[0]) parts.push(`Drinks at ${breweries[0].name}`);
    parts.push(`${total} options total.`);

    return NextResponse.json({
      ok: true,
      location: { query: location, lat: geo.lat, lng: geo.lng, resolved: geo.display_name },
      plan,
      summary: parts.join(' | '),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Request failed';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
