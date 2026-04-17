import { NextRequest, NextResponse } from 'next/server';
import { SEED_CATALOG, filterCatalog } from '@/lib/catalog';
import type { CatalogFilters } from '@/lib/catalog';

const GRADES = new Set(['A', 'B', 'C', 'D', 'F']);
const SORTS = new Set(['newest', 'cheapest', 'highest-rated']);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters: CatalogFilters = {};

  const q = params.get('q');
  if (q) filters.q = q;

  const category = params.get('category');
  if (category) filters.category = category;

  const network = params.get('network');
  if (network) filters.network = network;

  const maxPrice = params.get('maxPrice');
  if (maxPrice !== null) {
    const parsed = Number(maxPrice);
    if (!Number.isNaN(parsed)) filters.maxPrice = parsed;
  }

  const minGrade = params.get('minGrade');
  if (minGrade && GRADES.has(minGrade)) {
    filters.minGrade = minGrade as CatalogFilters['minGrade'];
  }

  const sort = params.get('sort');
  if (sort && SORTS.has(sort)) {
    filters.sort = sort as CatalogFilters['sort'];
  }

  const results = filterCatalog(SEED_CATALOG, filters);
  return NextResponse.json({ total: results.length, entries: results });
}
