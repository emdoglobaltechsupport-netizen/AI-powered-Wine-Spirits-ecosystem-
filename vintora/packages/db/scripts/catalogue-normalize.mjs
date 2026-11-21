/* =========================================================
   Vintora catalogue ingestion — canonical normalisation.

   Rule: a field is populated only when a source supplies it or
   when it is an explicitly derived identifier/tag. Missing facts
   stay null/[] and are reported as missing in provenance.
   ========================================================= */

import { hashId } from './catalogue-adapters.mjs';

export const CANONICAL_FIELDS = [
  'category', 'subcategory', 'brand_name', 'product_name', 'country_of_origin',
  'region', 'producer_distillery', 'abv_pct', 'bottle_size', 'bottle_size_ml',
  'tasting_notes', 'food_pairing', 'awards', 'product_description',
  'msrp_price_usd', 'average_global_retail_price_usd', 'product_sku', 'barcode',
  'official_brand_website', 'official_product_page', 'official_product_image_url',
  'additional_gallery_images', 'product_tags', 'premium_luxury_segment',
  'popularity_score', 'ai_recommendation_tags',
];

export const CONFIDENCE_WEIGHTS = {
  category: 3, subcategory: 3, brand_name: 3, product_name: 3,
  country_of_origin: 2, producer_distillery: 2, abv_pct: 2, bottle_size: 2,
  tasting_notes: 1, food_pairing: 1, awards: 1, product_description: 2,
  msrp_price_usd: 2, average_global_retail_price_usd: 2, product_sku: 2,
  barcode: 2, official_brand_website: 1, official_product_page: 1,
  official_product_image_url: 1, additional_gallery_images: 1, product_tags: 1,
  premium_luxury_segment: 1, popularity_score: 1, ai_recommendation_tags: 1,
};

const RULES = [
  // Wine — specific styles before generic ones.
  ['Wine', 'Champagne', /champagne/i],
  ['Wine', 'Sparkling Wine', /sparkling|prosecco|cava|cr[eé]mant|frizzante/i],
  ['Wine', 'Rosé Wine', /ros[eé]|rosado/i],
  ['Wine', 'Dessert Wine', /dessert|sauternes|ice ?wine|late harvest|moscato d'asti/i],
  ['Wine', 'Fortified Wine', /fortified|porto|port wine|sherry|madiera|madeira|vermouth/i],
  ['Wine', 'Red Wine', /red wine|red-wine|cabernet|merlot|pinot noir|syrah|shiraz|malbec|sangiovese|tempranillo|zinfandel|bordeaux|burgundy|rioja|barolo|chianti/i],
  ['Wine', 'White Wine', /white wine|white-wine|chardonnay|sauvignon|riesling|pinot grigio|pinot gris|viognier|gew[iü]rztraminer|albari[nñ]o/i],

  // Whisky & whiskey — specific expressions before origin.
  ['Whisky & Whiskey', 'Single Malt', /single malt/i],
  ['Whisky & Whiskey', 'Blended Scotch', /blended scotch|scotch blended/i],
  ['Whisky & Whiskey', 'Bourbon', /bourbon/i],
  ['Whisky & Whiskey', 'Rye Whiskey', /rye whis(ky|key)/i],
  ['Whisky & Whiskey', 'Irish Whiskey', /irish whis(ky|key)/i],
  ['Whisky & Whiskey', 'Japanese Whisky', /japanese whis(ky|key)|japan whisky/i],
  ['Whisky & Whiskey', 'Indian Whisky', /indian whis(ky|key)/i],
  ['Whisky & Whiskey', 'Scotch Whisky', /scotch/i],
  ['Whisky & Whiskey', 'Scotch Whisky', /whis(ky|key)/i],

  // Vodka.
  ['Vodka', 'Flavored Vodka', /vodka.*(flavou?r|citron|vanilla|chocolate|citrus|berry|peach|mango|apple|honey|chili|pepper)/i],
  ['Vodka', 'Premium Vodka', /vodka/i],

  // Gin.
  ['Gin', 'London Dry Gin', /london dry/i],
  ['Gin', 'Craft Gin', /craft gin|small batch gin|navy strength gin/i],
  ['Gin', 'Premium Gin', /premium gin|gin/i],

  // Rum.
  ['Rum', 'Spiced Rum', /spiced rum|spiced/i],
  ['Rum', 'White Rum', /white rum|light rum|blanco rum/i],
  ['Rum', 'Dark Rum', /dark rum|black rum/i],
  ['Rum', 'Aged Rum', /aged rum|a[nñ]ejo rum|extra old rum|solera rum|rum/i],

  // Tequila & mezcal — longest expressions first.
  ['Tequila & Mezcal', 'Extra Añejo', /extra a[nñ]ejo/i],
  ['Tequila & Mezcal', 'Añejo', /a[nñ]ejo/i],
  ['Tequila & Mezcal', 'Reposado', /reposado/i],
  ['Tequila & Mezcal', 'Blanco', /blanco|silver tequila|joven/i],
  ['Tequila & Mezcal', 'Mezcal', /mezcal/i],
  ['Tequila & Mezcal', 'Blanco', /tequila/i],

  // Brandy & cognac.
  ['Brandy & Cognac', 'Cognac', /cognac/i],
  ['Brandy & Cognac', 'Armagnac', /armagnac/i],
  ['Brandy & Cognac', 'Brandy', /brandy/i],

  // Liqueurs.
  ['Liqueurs', 'Coffee Liqueur', /coffee liqueur|coffee liquor|kahl[uú]a/i],
  ['Liqueurs', 'Cream Liqueur', /cream liqueur|baileys|irish cream/i],
  ['Liqueurs', 'Fruit Liqueur', /fruit liqueur|framboise|limoncello|grand marnier|cointreau|chartreuse.*fruit/i],
  ['Liqueurs', 'Herbal Liqueur', /herbal liqueur|chartreuse|j[eä]germeister|amaro|bitter liqueur/i],
  ['Liqueurs', 'Herbal Liqueur', /liqueur|liquer/i],

  // Beer.
  ['Beer', 'IPA', /ipa|india pale ale/i],
  ['Beer', 'Stout', /stout|porter/i],
  ['Beer', 'Lager', /lager|pilsner|pilsen|helles/i],
  ['Beer', 'Ale', /ale|witbier|hefeweizen|saison|belgian/i],
  ['Beer', 'Craft Beer', /beer|cerveza|bi[eè]re/i],
];

const COUNTRY_TAGS = {
  france: 'France', italy: 'Italy', spain: 'Spain', portugal: 'Portugal',
  'united-kingdom': 'United Kingdom', uk: 'United Kingdom', scotland: 'United Kingdom',
  ireland: 'Ireland', 'united-states': 'United States', usa: 'United States',
  canada: 'Canada', mexico: 'Mexico', japan: 'Japan', india: 'India',
  australia: 'Australia', 'new-zealand': 'New Zealand', germany: 'Germany',
  netherlands: 'Netherlands', belgium: 'Belgium', switzerland: 'Switzerland',
  austria: 'Austria', chile: 'Chile', argentina: 'Argentina', brazil: 'Brazil',
  'south-africa': 'South Africa', china: 'China', thailand: 'Thailand',
  singapore: 'Singapore', sweden: 'Sweden', denmark: 'Denmark', norway: 'Norway',
  finland: 'Finland', poland: 'Poland', 'united-arab-emirates': 'United Arab Emirates',
};

function isPresent(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const text = value.trim();
    return text !== '' && !/REPLACE[_ ]?ME|^EXAMPLE\b|example\.invalid/i.test(text);
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function firstPresent(record, keys) {
  for (const key of keys) if (isPresent(record?.[key])) return record[key];
  return null;
}

function asText(value) {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join('; ') || null;
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch { return null; }
  }
  const text = String(value).trim();
  return text || null;
}

function asNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const match = String(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function asArray(value) {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  return String(value).split(/[;|]/).map(asText).filter(Boolean);
}

function classify(record, taxonomy) {
  const explicitCategory = asText(firstPresent(record, ['category', 'product_category']));
  const explicitSubcategory = asText(firstPresent(record, ['subcategory', 'product_subcategory']));
  if (explicitCategory && taxonomy.categories[explicitCategory]?.includes(explicitSubcategory)) {
    return { category: explicitCategory, subcategory: explicitSubcategory, derived: false };
  }

  const haystack = [
    explicitCategory, explicitSubcategory,
    asText(firstPresent(record, ['product_name', 'name', 'generic_name', 'title'])),
    asText(record.categories),
    Array.isArray(record.categories_tags) ? record.categories_tags.join(' ') : null,
    Array.isArray(record.labels_tags) ? record.labels_tags.join(' ') : null,
  ].filter(Boolean).join(' ');

  for (const [category, subcategory, pattern] of RULES) {
    if (pattern.test(haystack) && (!explicitCategory || explicitCategory === category)) {
      return { category, subcategory, derived: true };
    }
  }
  return {
    category: explicitCategory || 'Unclassified',
    subcategory: explicitSubcategory || 'Unclassified',
    derived: true,
  };
}

function parseAbv(record) {
  const value = firstPresent(record, [
    'abv_pct', 'abv', 'alcohol_content', 'alcohol', 'alcohol_by_volume',
  ]) ?? record?.nutriments?.alcohol ?? null;
  const number = asNumber(value);
  return number !== null && number > 0 && number <= 100 ? number : null;
}

function parseBottleSize(record) {
  const raw = firstPresent(record, ['bottle_size', 'bottle_size_ml', 'quantity', 'volume', 'size']);
  if (raw === null) return { label: null, ml: null };
  const text = asText(raw);
  const number = asNumber(text);
  const lower = text.toLowerCase();
  let ml = null;
  if (/ml\b|millilit/.test(lower)) ml = Math.round(number);
  else if (/cl\b|centilit/.test(lower)) ml = Math.round(number * 10);
  else if (/\bl\b|litre|liter/.test(lower)) ml = Math.round(number * 1000);
  else if (number && number < 20) ml = Math.round(number * 1000);
  else if (number) ml = Math.round(number);
  return {
    label: text,
    ml: ml !== null && ml > 0 ? ml : null,
  };
}

function countryFrom(record) {
  const direct = firstPresent(record, ['country_of_origin', 'country', 'origin_country']);
  if (direct !== null) return { value: asText(direct), derived: false };
  const tags = Array.isArray(record.countries_tags) ? record.countries_tags : [];
  if (tags.length) {
    const tag = String(tags[0]).replace(/^en:/, '');
    return { value: COUNTRY_TAGS[tag] || tag.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), derived: true };
  }
  const countries = firstPresent(record, ['countries', 'country_of_origin_label']);
  return countries !== null
    ? { value: String(countries).split(',')[0].trim(), derived: true }
    : { value: null, derived: false };
}

function imagesFrom(record) {
  const main = firstPresent(record, ['official_product_image_url', 'product_image_url']) || null;
  const galleryRaw = firstPresent(record, ['additional_gallery_images', 'gallery_images']) || [];
  const gallery = asArray(galleryRaw);
  if (record.images && typeof record.images === 'object') {
    for (const key of Object.keys(record.images)) {
      const entry = record.images[key];
      const url = typeof entry === 'string' ? entry : entry?.url;
      if (url && !gallery.includes(url) && url !== main) gallery.push(url);
    }
  }
  const offImage = firstPresent(record, ['image_front_url', 'image_url']);
  return {
    official: main ? asText(main) : null,
    gallery,
    sourceImage: offImage ? asText(offImage) : null,
  };
}

function tagsFrom(record) {
  const direct = firstPresent(record, ['product_tags', 'tags']);
  if (direct !== null) return { values: asArray(direct), derived: false };
  const offTags = [
    ...(Array.isArray(record.labels_tags) ? record.labels_tags : []),
    ...(Array.isArray(record.tags_tags) ? record.tags_tags : []),
  ].map((tag) => String(tag).replace(/^en:/, '').replace(/-/g, ' '));
  return { values: [...new Set(offTags.filter(Boolean))], derived: offTags.length > 0 };
}

function overallConfidence(confidence) {
  let weighted = 0;
  let total = 0;
  for (const [field, weight] of Object.entries(CONFIDENCE_WEIGHTS)) {
    const level = confidence[field] || 'missing';
    const score = level === 'verified' ? 1 : level === 'derived' ? 0.6 : 0;
    weighted += weight * score;
    total += weight;
  }
  return total ? Math.round((weighted / total) * 1000) / 1000 : 0;
}

function emptyConfidence() {
  return Object.fromEntries(CANONICAL_FIELDS.map((field) => [field, 'missing']));
}

/* Convert one adapter envelope into a canonical catalogue row. */
export function normalizeRecord(envelope, taxonomy, sourcePriority = {}) {
  const record = envelope.raw || {};
  const classified = classify(record, taxonomy);
  const abv = parseAbv(record);
  const bottle = parseBottleSize(record);
  const country = countryFrom(record);
  const images = imagesFrom(record);
  const tags = tagsFrom(record);

  const brand = asText(firstPresent(record, ['brand_name', 'brand', 'brands']));
  const productName = asText(firstPresent(record, ['product_name', 'name', 'generic_name', 'title']));
  const barcodeValue = asText(firstPresent(record, ['barcode', 'ean', 'gtin', 'code']));
  const barcode = barcodeValue && /^\d{8,14}$/.test(barcodeValue) ? barcodeValue : null;
  const sourceId = envelope.source_record_id || hashId(JSON.stringify(record));

  const productSku = asText(firstPresent(record, ['product_sku', 'sku']))
    || `VIN-${String(envelope.source || 'src').toUpperCase()}-${hashId(sourceId)}`;

  const licensedAwards = asArray(firstPresent(record, ['awards']) || []);
  const aiDirect = asArray(firstPresent(record, ['ai_recommendation_tags', 'ai_tags']) || []);
  const aiDerived = [...new Set([
    ...aiDirect,
    `category:${String(classified.category).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    `subcategory:${String(classified.subcategory).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    ...tags.values.slice(0, 5),
  ])];

  const confidence = emptyConfidence();
  const note = (field, level) => { confidence[field] = level; };
  const set = (field, value, level = 'verified') => {
    if (isPresent(value)) note(field, level);
    return value;
  };

  const product = {
    category: set('category', classified.category, classified.derived ? 'derived' : 'verified'),
    subcategory: set('subcategory', classified.subcategory, classified.derived ? 'derived' : 'verified'),
    brand_name: set('brand_name', brand),
    product_name: set('product_name', productName),
    country_of_origin: set('country_of_origin', country.value, country.derived ? 'derived' : 'verified'),
    region: set('region', asText(firstPresent(record, ['region', 'appellation']))),
    producer_distillery: set('producer_distillery', asText(firstPresent(record, [
      'producer_distillery', 'producer', 'distillery', 'manufacturer',
    ]))),
    abv_pct: set('abv_pct', abv),
    bottle_size: set('bottle_size', bottle.label, 'derived'),
    bottle_size_ml: set('bottle_size_ml', bottle.ml, 'derived'),
    tasting_notes: set('tasting_notes', asText(firstPresent(record, ['tasting_notes', 'notes']))),
    food_pairing: set('food_pairing', asText(firstPresent(record, ['food_pairing', 'pairings']))),
    awards: set('awards', licensedAwards),
    product_description: set('product_description', asText(firstPresent(record, [
      'product_description', 'description', 'generic_name',
    ]))),
    msrp_price_usd: set('msrp_price_usd', asNumber(firstPresent(record, ['msrp_price_usd', 'msrp']))),
    average_global_retail_price_usd: set('average_global_retail_price_usd', asNumber(firstPresent(record, [
      'average_global_retail_price_usd', 'average_global_retail_price',
    ]))),
    product_sku: set('product_sku', productSku, asText(firstPresent(record, ['product_sku', 'sku'])) ? 'verified' : 'derived'),
    barcode: set('barcode', barcode),
    official_brand_website: set('official_brand_website', asText(firstPresent(record, ['official_brand_website', 'brand_website']))),
    official_product_page: set('official_product_page', asText(firstPresent(record, ['official_product_page', 'product_page']))),
    official_product_image_url: set('official_product_image_url', images.official),
    additional_gallery_images: set('additional_gallery_images', images.gallery),
    product_tags: set('product_tags', tags.values, tags.derived ? 'derived' : 'verified'),
    premium_luxury_segment: set('premium_luxury_segment', asText(firstPresent(record, [
      'premium_luxury_segment', 'segment', 'luxury_segment',
    ]))),
    popularity_score: set('popularity_score', asNumber(firstPresent(record, ['popularity_score', 'popularity']))),
    ai_recommendation_tags: set('ai_recommendation_tags', aiDerived, aiDirect.length ? 'verified' : 'derived'),
  };

  return {
    ...product,
    provenance: {
      source: envelope.source || 'unknown',
      source_record_id: sourceId,
      source_url: envelope.source_url || null,
      licence: envelope.license || null,
      retrieved_at: envelope.retrieved_at || null,
      source_priority: sourcePriority[envelope.source] || 0,
      source_image_url: images.sourceImage,
      unclassified: classified.subcategory === 'Unclassified',
      confidence,
      overall_confidence: overallConfidence(confidence),
      notes: [
        'No field is synthesised to satisfy catalogue targets.',
        'Null/empty fields mean the source did not provide a verified value.',
        'Derived values are identifiers or taxonomy mappings and are labelled as derived.',
      ],
    },
  };
}

function dedupeKey(record) {
  if (record.barcode) return `barcode:${record.barcode}`;
  const brand = String(record.brand_name || '').toLowerCase().trim();
  const name = String(record.product_name || '').toLowerCase().trim();
  if (brand && name) return `name:${brand}|${name}`;
  return `source:${record.provenance.source_record_id}`;
}

function isEmptyField(record, field) {
  const value = record[field];
  return value === null || value === undefined || value === '' || (Array.isArray(value) && !value.length);
}

export function dedupeAndMerge(records) {
  const ordered = [...records].sort((a, b) => {
    const priority = (b.provenance.source_priority || 0) - (a.provenance.source_priority || 0);
    return priority || b.provenance.overall_confidence - a.provenance.overall_confidence;
  });
  const byKey = new Map();
  for (const record of ordered) {
    const key = dedupeKey(record);
    const primary = byKey.get(key);
    if (!primary) { byKey.set(key, record); continue; }
    const sources = primary.provenance.sources || [primary.provenance.source];
    if (!sources.includes(record.provenance.source)) sources.push(record.provenance.source);
    primary.provenance.sources = sources;
    for (const field of CANONICAL_FIELDS) {
      if (!isEmptyField(primary, field) && isEmptyField(record, field)) continue;
      if (isEmptyField(primary, field) && !isEmptyField(record, field)) {
        primary[field] = record[field];
        if (record.provenance.confidence?.[field]) {
          primary.provenance.confidence[field] = record.provenance.confidence[field];
        }
      }
    }
    primary.provenance.overall_confidence = overallConfidence(primary.provenance.confidence);
  }
  return [...byKey.values()];
}
