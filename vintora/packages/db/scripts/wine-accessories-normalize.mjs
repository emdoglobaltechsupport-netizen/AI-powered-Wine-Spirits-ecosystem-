/* =========================================================
   Vintora Wine Accessories catalogue — canonical normalisation.

   Every commercial fact remains source-bound. Derived values are
   limited to taxonomy mapping, internal SKUs, search text and
   deterministic enrichment, and are labelled as derived.
   ========================================================= */

import { hashId } from './wine-accessories-adapters.mjs';

export const CANONICAL_FIELDS = [
  'sku', 'category', 'brand', 'product_name', 'materials', 'dimensions',
  'care_instructions', 'tags', 'compliance_notes', 'msrp_usd',
  'regional_prices', 'assets', 'official_image_url', 'backup_image_urls',
  'image_moderation', 'search_index', 'ai_enrichment', 'cross_sells',
  'bundles', 'provenance', 'validation', 'audit_log',
];

const CATEGORY_RULES = [
  ['Decanters', /decanter|carafe/i],
  ['Corkscrews', /corkscrew|waiter'?s friend|cork puller|wine key|bottle opener/i],
  ['Aerators', /aerator|decanting pourer|pouring spout/i],
  ['Preservation Systems', /preserv|vacuum|wine saver|inert gas|coravin|gas saver/i],
  ['Chillers', /chiller|wine cooler|cooling sleeve|ice sleeve/i],
  ['Storage Racks', /rack|shelf|storage system|wine storage/i],
  ['Gift Sets', /gift set|gift box|gift pack|accessory set/i],
  ['Cleaning Tools', /clean|brush|cloth|microfibre|microfiber/i],
  ['Glassware', /glass|stemware|tumbler|goblet|flute/i],
];

function isEmpty(value) {
  return value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

function parseMaybeJson(value) {
  if (typeof value !== 'string') return value;
  const text = value.trim();
  if ((text.startsWith('[') && text.endsWith(']')) ||
      (text.startsWith('{') && text.endsWith('}'))) {
    try { return JSON.parse(text); } catch { /* keep raw string */ }
  }
  return value;
}

function firstPresent(record, keys) {
  for (const key of keys) {
    const value = parseMaybeJson(record?.[key]);
    if (!isEmpty(value)) return value;
  }
  return null;
}

function asText(value) {
  const parsed = parseMaybeJson(value);
  if (parsed === null || parsed === undefined) return null;
  if (Array.isArray(parsed)) return parsed.map(asText).filter(Boolean).join('; ') || null;
  if (typeof parsed === 'object') {
    return asText(parsed.text || parsed.value || parsed.name || parsed.note) || null;
  }
  const text = String(parsed).trim();
  return text || null;
}

function asNumber(value) {
  const parsed = parseMaybeJson(value);
  if (parsed === null || parsed === undefined || parsed === '') return null;
  const match = String(parsed).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function asArray(value) {
  const parsed = parseMaybeJson(value);
  if (parsed === null || parsed === undefined) return [];
  if (Array.isArray(parsed)) {
    return parsed.map(parseMaybeJson).filter((entry) => !isEmpty(entry));
  }
  if (typeof parsed === 'object') return [parsed];
  return String(parsed).split(/[;|]/).map((entry) => entry.trim()).filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function classifyCategory(record, taxonomy) {
  const raw = asText(firstPresent(record, ['category', 'product_category', 'collection']));
  const explicit = taxonomy.categories.find((category) =>
    category.toLowerCase() === String(raw || '').toLowerCase(),
  ) || null;
  if (explicit) return { category: explicit, derived: false };

  const haystack = [
    raw,
    asText(firstPresent(record, ['subcategory', 'product_subcategory'])),
    asText(firstPresent(record, ['product_name', 'name', 'title'])),
    asArray(firstPresent(record, ['tags', 'product_tags'])).join(' '),
  ].filter(Boolean).join(' ');

  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(haystack)) return { category, derived: true };
  }
  return { category: raw || 'Unclassified', derived: true };
}

function dimensionsFrom(record) {
  const raw = parseMaybeJson(firstPresent(record, ['dimensions', 'size_dimensions']));
  const source = raw && typeof raw === 'object' ? raw : {};
  const number = (keys) => asNumber(firstPresent(source, keys) ?? firstPresent(record, keys));
  return {
    length: number(['length', 'length_cm', 'length_in', 'l']),
    width: number(['width', 'width_cm', 'width_in', 'w']),
    height: number(['height', 'height_cm', 'height_in', 'h']),
    weight: number(['weight', 'weight_g', 'weight_oz', 'mass_g', 'w_g']),
    linear_unit: asText(firstPresent(source, ['linear_unit', 'unit', 'length_unit']))
      || asText(firstPresent(record, ['linear_unit', 'dimension_unit'])) || 'cm',
    weight_unit: asText(firstPresent(source, ['weight_unit', 'mass_unit']))
      || asText(firstPresent(record, ['weight_unit'])) || 'g',
    source: asText(firstPresent(source, ['source', 'source_url']))
      || asText(firstPresent(record, ['dimension_source'])) || null,
  };
}

function tagsFrom(record, category, materials) {
  const explicit = asArray(firstPresent(record, ['tags', 'product_tags']));
  if (explicit.length) return { values: explicit.map(asText).filter(Boolean), derived: false };
  const derived = [
    'wine-accessory',
    slugify(category),
    ...materials.map((material) => `material:${slugify(material)}`),
  ];
  return { values: [...new Set(derived.filter(Boolean))], derived: true };
}

function notesFrom(record) {
  const direct = asArray(firstPresent(record, ['compliance_notes', 'compliance']))
    .map((entry) => {
      if (entry && typeof entry === 'object') {
        return {
          text: asText(entry.text || entry.note || entry.value),
          origin: asText(entry.origin) || 'verified',
          reference: asText(entry.reference || entry.source_url) || null,
        };
      }
      return { text: asText(entry), origin: 'verified', reference: null };
    })
    .filter((note) => note.text);

  const derived = [
    {
      text: 'Verify food-contact material declarations and jurisdictional product-claim rules before publication.',
      origin: 'derived',
      reference: null,
    },
    {
      text: 'Confirm every image licence, authorisation reference and moderation approval before publication.',
      origin: 'derived',
      reference: null,
    },
  ];
  return [...direct, ...derived];
}

function pricesFrom(record) {
  const raw = firstPresent(record, ['regional_prices', 'regional_price', 'prices']);
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list.map((entry) => {
    const price = parseMaybeJson(entry);
    if (!price || typeof price !== 'object') return null;
    return {
      region: asText(price.region || price.market || price.country),
      currency: asText(price.currency)?.toUpperCase() || null,
      amount: asNumber(price.amount || price.price || price.value),
      price_type: asText(price.price_type) || 'local_retail',
      effective_date: asText(price.effective_date) || null,
      source: asText(price.source || price.supplier) || null,
      source_url: asText(price.source_url) || null,
    };
  }).filter((price) => price && price.region && price.currency && price.amount !== null);
}

function assetFrom(entry, role, defaults) {
  const asset = parseMaybeJson(entry);
  const object = asset && typeof asset === 'object' ? asset : { url: asset };
  const url = asText(object.url || object.image_url || object.official_image_url || object.backup_image_url);
  if (!url) return null;

  const moderationRaw = parseMaybeJson(object.moderation || {});
  return {
    role,
    url,
    licence: asText(object.licence || object.license || object.asset_licence || object.asset_license)
      || defaults.licence || null,
    licence_holder: asText(object.licence_holder || object.license_holder || object.authorizing_party)
      || null,
    authorizing_party: asText(object.authorizing_party || object.licensor || object.rights_holder)
      || null,
    authorization_reference: asText(object.authorization_reference || object.authorization_id
      || object.contract_reference) || defaults.authorization_reference || null,
    authorized: object.authorized === true || object.authorized === 'true' || defaults.authorized === true,
    source_url: asText(object.source_url || object.asset_page_url) || null,
    checksum_sha256: asText(object.checksum_sha256) || null,
    width_px: asNumber(object.width_px || object.width),
    height_px: asNumber(object.height_px || object.height),
    moderation: {
      status: asText(moderationRaw.status || object.moderation_status || object.image_moderation_status)
        || asText(recordModerationStatus(defaults.record)) || 'pending',
      checked_at: asText(moderationRaw.checked_at || object.moderation_checked_at)
        || defaults.checked_at || null,
      checked_by: asText(moderationRaw.checked_by || object.moderation_checker)
        || defaults.checked_by || null,
      reasons: asArray(moderationRaw.reasons || object.moderation_reasons).map(asText).filter(Boolean),
    },
    origin: asText(object.origin) || 'source',
  };
}

function recordModerationStatus(record) {
  return firstPresent(record, ['image_moderation_status', 'moderation_status']);
}

function assetsFrom(record, envelope, taxonomy) {
  const feedLicence = asText(envelope.license);
  const defaultLicence = taxonomy.allowedAssetLicences.includes(feedLicence) ? feedLicence : null;
  const defaults = {
    licence: defaultLicence,
    authorization_reference: asText(firstPresent(record, ['authorization_reference', 'asset_authorization_reference'])),
    authorized: firstPresent(record, ['asset_authorized', 'images_authorized']) === true,
    checked_at: asText(firstPresent(record, ['image_moderation_checked_at', 'moderation_checked_at'])),
    checked_by: asText(firstPresent(record, ['image_moderation_checked_by', 'moderation_checker'])),
    record,
  };

  const assets = [];
  const explicitAssets = asArray(firstPresent(record, ['assets', 'images']));
  for (const entry of explicitAssets) {
    const role = asText(entry?.role) || 'backup';
    const asset = assetFrom(entry, role, defaults);
    if (asset) assets.push(asset);
  }

  const officialRaw = firstPresent(record, ['official_image_url', 'official_product_image_url']);
  if (officialRaw && !assets.some((asset) => asset.role === 'official' && asset.url === asText(officialRaw))) {
    const official = assetFrom(officialRaw, 'official', defaults);
    if (official) assets.push(official);
  }

  const backups = asArray(firstPresent(record, ['backup_image_urls', 'backup_images', 'additional_gallery_images']));
  for (const entry of backups) {
    const asset = assetFrom(entry, 'backup', defaults);
    if (asset && !assets.some((existing) => existing.url === asset.url)) assets.push(asset);
  }

  const deduped = [];
  for (const asset of assets) {
    const key = `${asset.role}:${asset.url}`;
    if (!deduped.some((existing) => `${existing.role}:${existing.url}` === key)) deduped.push(asset);
  }
  return deduped;
}

function moderationFrom(assets, record) {
  const statuses = assets.map((asset, index) => ({
    role: asset.role,
    index,
    status: asset.moderation.status,
  }));
  const hasRejected = statuses.some((entry) => entry.status === 'rejected');
  const hasPending = statuses.some((entry) => entry.status !== 'approved');
  const status = !assets.length ? 'missing' : hasRejected ? 'rejected' : hasPending ? 'pending' : 'approved';
  return {
    status,
    checked_at: asText(firstPresent(record, ['image_moderation_checked_at', 'moderation_checked_at'])),
    checked_by: asText(firstPresent(record, ['image_moderation_checked_by', 'moderation_checker'])),
    reasons: assets.flatMap((asset) => asset.moderation.reasons),
    asset_statuses: statuses,
  };
}

function searchIndexFrom(row) {
  const document = [
    row.brand,
    row.product_name,
    row.category,
    ...row.materials,
    ...row.tags,
  ].filter(Boolean).join(' ');
  const keywords = [...new Set([
    row.category,
    row.brand,
    row.product_name,
    ...row.tags,
    ...row.materials,
    ...String(document).toLowerCase().match(/[a-z0-9]{3,}/g) || [],
  ])].filter(Boolean).slice(0, 80);
  return {
    search_document: String(document).slice(0, 8000),
    search_keywords: keywords,
    normalized_brand: slugify(row.brand || ''),
    normalized_name: slugify(row.product_name || ''),
    category_path: ['Wine Accessories', row.category],
    searchable: true,
  };
}

function enrichFrom(row, record, taxonomy, generatedAt) {
  const config = taxonomy.enrichment || {};
  const related = taxonomy.crossSellMap?.[row.category] || [];
  const sourceBundles = asArray(firstPresent(record, ['bundles', 'gift_bundles']))
    .map((entry) => {
      const bundle = parseMaybeJson(entry);
      if (typeof bundle === 'string') {
        return { bundle_id: slugify(bundle), name: bundle, skus: [], origin: 'verified' };
      }
      if (!bundle || typeof bundle !== 'object') return null;
      return {
        bundle_id: asText(bundle.bundle_id || bundle.id) || slugify(bundle.name || row.sku),
        name: asText(bundle.name),
        skus: asArray(bundle.skus).map(asText).filter(Boolean),
        origin: 'verified',
      };
    }).filter(Boolean);

  const suggestedBundles = related.slice(0, 3).map((category) => ({
    bundle_id: `SUG-${row.sku}-${slugify(category)}`.slice(0, 96),
    name: `${row.product_name} + ${category}`,
    categories: [row.category, category],
    skus: [],
    origin: 'derived',
  }));

  const sourceCrossSells = asArray(firstPresent(record, ['cross_sell_skus', 'cross_sells']))
    .map((entry) => {
      const cross = parseMaybeJson(entry);
      if (typeof cross === 'string' && /^[A-Z0-9][A-Z0-9._-]{2,64}$/.test(cross)) {
        return { type: 'sku', value: cross, origin: 'verified' };
      }
      if (cross && typeof cross === 'object' && cross.sku) {
        return { type: 'sku', value: asText(cross.sku), origin: 'verified' };
      }
      return null;
    }).filter(Boolean);

  const derivedCrossSells = related.map((category) => ({
    type: 'category',
    value: category,
    origin: 'derived',
  }));

  const materials = row.materials.join(', ');
  const seoDescription = `${row.brand} ${row.product_name} in ${row.category}.` +
    (materials ? ` Materials: ${materials}.` : '') +
    ' Review licensed product copy before publication.';

  return {
    provider: config.provider || 'deterministic',
    model: config.model || 'vintora-wine-accessories-rules-v1',
    generated_at: generatedAt,
    notice: config.notice || 'Rule-based enrichment; no live model or accuracy claim.',
    confidence: 'derived',
    seo: {
      title: `${row.brand} ${row.product_name} | ${row.category} | Vintora`.slice(0, 120),
      description: seoDescription.slice(0, 155),
      slug: slugify(`${row.brand}-${row.product_name}`),
      keywords: row.search_index.search_keywords.slice(0, 20),
    },
    bundles: [...sourceBundles, ...suggestedBundles],
    cross_sells: [...sourceCrossSells, ...derivedCrossSells],
  };
}

function confidenceFrom(fieldConfidence) {
  const weights = {
    sku: 2, category: 2, brand: 2, product_name: 2, materials: 2, dimensions: 2,
    care_instructions: 1, tags: 1, compliance_notes: 1, msrp_usd: 2,
    regional_prices: 2, assets: 2, official_image_url: 2, backup_image_urls: 0.5,
    image_moderation: 1, search_index: 1, ai_enrichment: 1, cross_sells: 1,
    bundles: 0.5,
  };
  let weighted = 0;
  let total = 0;
  for (const [field, weight] of Object.entries(weights)) {
    const level = fieldConfidence[field] || 'missing';
    weighted += weight * (level === 'verified' ? 1 : level === 'derived' ? 0.6 : 0);
    total += weight;
  }
  return total ? Math.round((weighted / total) * 1000) / 1000 : 0;
}

/* Convert one adapter envelope into a canonical accessory row. */
export function normalizeAccessory(envelope, taxonomy, generatedAt = new Date().toISOString()) {
  const record = envelope.raw || {};
  const classified = classifyCategory(record, taxonomy);
  const materials = asArray(firstPresent(record, ['materials', 'material'])).map(asText).filter(Boolean);
  const tags = tagsFrom(record, classified.category, materials);
  const complianceNotes = notesFrom(record);
  const regionalPrices = pricesFrom(record);
  const assets = assetsFrom(record, envelope, taxonomy);
  const moderation = moderationFrom(assets, record);

  const sourceId = envelope.source_record_id || hashId(JSON.stringify(record));
  const sourceSku = asText(firstPresent(record, ['sku', 'product_sku']));
  const sku = sourceSku || `WA-${String(envelope.source || 'src').toUpperCase()}-${hashId(sourceId)}`;
  const officialAsset = assets.find((asset) => asset.role === 'official');

  const base = {
    sku,
    category: classified.category,
    brand: asText(firstPresent(record, ['brand', 'brand_name'])),
    product_name: asText(firstPresent(record, ['product_name', 'name', 'title'])),
    materials,
    dimensions: dimensionsFrom(record),
    care_instructions: asArray(firstPresent(record, ['care_instructions', 'care', 'instructions']))
      .map(asText).filter(Boolean),
    tags: tags.values,
    compliance_notes: complianceNotes,
    msrp_usd: asNumber(firstPresent(record, ['msrp_usd', 'msrp', 'retail_price_usd'])),
    regional_prices: regionalPrices,
    assets,
    official_image_url: officialAsset?.url || null,
    backup_image_urls: assets.filter((asset) => asset.role === 'backup').map((asset) => asset.url),
    image_moderation: moderation,
    search_index: null,
    ai_enrichment: null,
    cross_sells: [],
    bundles: [],
  };

  base.search_index = searchIndexFrom(base);
  const enrichment = enrichFrom(base, record, taxonomy, generatedAt);
  base.ai_enrichment = enrichment;
  base.cross_sells = enrichment.cross_sells;
  base.bundles = enrichment.bundles;

  const fieldConfidence = {};
  const mark = (field, level, value) => {
    fieldConfidence[field] = isEmpty(value) ? 'missing' : level;
  };
  mark('sku', sourceSku ? 'verified' : 'derived', sku);
  mark('category', classified.derived ? 'derived' : 'verified', base.category);
  mark('brand', 'verified', base.brand);
  mark('product_name', 'verified', base.product_name);
  mark('materials', 'verified', materials);
  mark('dimensions', 'verified', Object.values(base.dimensions).some((value) => typeof value === 'number'));
  mark('care_instructions', 'verified', base.care_instructions);
  mark('tags', tags.derived ? 'derived' : 'verified', base.tags);
  mark('compliance_notes', 'derived', complianceNotes);
  mark('msrp_usd', 'verified', base.msrp_usd);
  mark('regional_prices', 'verified', regionalPrices);
  mark('assets', 'verified', assets);
  mark('official_image_url', 'verified', base.official_image_url);
  mark('backup_image_urls', 'verified', base.backup_image_urls);
  mark('image_moderation', 'verified', moderation.status !== 'missing');
  mark('search_index', 'derived', base.search_index.search_document);
  mark('ai_enrichment', 'derived', enrichment.seo.title);
  mark('cross_sells', 'derived', base.cross_sells);
  mark('bundles', 'derived', base.bundles);

  const sourceUrl = envelope.source_url || null;
  base.provenance = {
    source: envelope.source || 'unknown',
    source_record_id: sourceId,
    source_url: sourceUrl,
    licence: envelope.license || null,
    retrieved_at: envelope.retrieved_at || generatedAt,
    source_priority: taxonomy.sourcePriority?.[envelope.source] || 0,
    field_confidence: fieldConfidence,
    overall_confidence: confidenceFrom(fieldConfidence),
    notes: [
      'No product, price, image, licence or authorisation value is generated to satisfy a catalogue goal.',
      'Null or empty values mean the source did not supply that fact.',
      'Derived values are taxonomy mappings, internal identifiers, search text or deterministic enrichment.',
    ],
  };

  base.validation = {
    valid: null,
    errors: [],
    warnings: [],
    rules_version: taxonomy.version,
  };
  base.audit_log = [{
    action: 'create',
    sku,
    at: generatedAt,
    actor: 'catalogue-normalize',
    source: envelope.source || 'unknown',
    reason: 'source record normalised',
    row_hash: hashId(JSON.stringify({ sku, source: envelope.source, source_record_id: sourceId })),
  }];
  return base;
}
