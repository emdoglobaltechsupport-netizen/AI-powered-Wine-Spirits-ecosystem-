/* =========================================================
   Vintora Wine Accessories catalogue — validation rules.

   The same rules run in the ingestion CLI and the PostgreSQL
   loader. Asset licence/authorisation and image moderation are
   hard gates by default, not warnings.
   ========================================================= */

export const VALIDATION_RULES = [
  { id: 'WA-001', severity: 'error', description: 'SKU must be present and match the configured SKU pattern.' },
  { id: 'WA-002', severity: 'error', description: 'Category must be one of the nine approved Wine Accessories categories.' },
  { id: 'WA-003', severity: 'error', description: 'Brand and product name must be non-empty.' },
  { id: 'WA-004', severity: 'error', description: 'At least one material and one care instruction must be supplied.' },
  { id: 'WA-005', severity: 'error', description: 'At least one positive numeric dimension must be supplied.' },
  { id: 'WA-006', severity: 'error', description: 'MSRP and at least one regional price with allowed currency must be supplied.' },
  { id: 'WA-007', severity: 'error', description: 'Tags and compliance notes must be non-empty.' },
  { id: 'WA-008', severity: 'error', description: 'At least one official image asset must be present; backups are optional.' },
  { id: 'WA-009', severity: 'error', description: 'Every image asset must have an allowed licence, explicit authorisation and a non-reserved URL.' },
  { id: 'WA-010', severity: 'error', description: 'Every image asset must have an approved moderation status and reviewer metadata.' },
  { id: 'WA-011', severity: 'error', description: 'Search index and deterministic AI enrichment fields must be present.' },
  { id: 'WA-012', severity: 'error', description: 'Provenance and an append-ready create audit entry must be present.' },
];

function isEmpty(value) {
  return value === null || value === undefined || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

function hasText(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function parsedUrl(value) {
  if (!hasText(value)) return null;
  try { return new URL(value); } catch { return null; }
}

function isReservedUrl(value, taxonomy) {
  const url = parsedUrl(value);
  if (!url) return true;
  if (!/^https?:$/i.test(url.protocol)) return true;
  const host = url.hostname.toLowerCase();
  if ((taxonomy.reservedHosts || []).some((reserved) =>
    host === reserved || host.endsWith(`.${reserved}`))) return true;
  if ((taxonomy.reservedUrlSuffixes || []).some((suffix) => host.endsWith(suffix))) return true;
  return false;
}

function moderationSummary(row) {
  const statuses = row.assets.map((asset) => asset?.moderation?.status || 'missing');
  if (!statuses.length) return 'missing';
  if (statuses.includes('rejected')) return 'rejected';
  if (statuses.some((status) => status !== 'approved')) return 'pending';
  return 'approved';
}

export function validateAccessory(row, taxonomy, options = {}) {
  const {
    requireApprovedImages = true,
    allowTestFixtures = false,
  } = options;
  const errors = [];
  const warnings = [];
  const config = taxonomy.validation || {};
  const error = (rule, message) => errors.push({ rule, message });
  const warn = (rule, message) => warnings.push({ rule, message });

  const skuPattern = new RegExp(taxonomy.skuPattern || '^[A-Z0-9][A-Z0-9._-]{2,64}$');
  if (!hasText(row.sku) || !skuPattern.test(row.sku)) error('WA-001', 'SKU is missing or invalid.');

  if (!taxonomy.categories.includes(row.category)) {
    error('WA-002', `Category must be one of: ${taxonomy.categories.join(', ')}.`);
  }
  if (!hasText(row.brand) || !hasText(row.product_name)) {
    error('WA-003', 'Brand and product name are required.');
  }

  if (!Array.isArray(row.materials) || row.materials.length < (config.minMaterials || 1)) {
    error('WA-004', 'At least one material is required.');
  }
  if (!Array.isArray(row.care_instructions) || row.care_instructions.length < (config.minCareInstructions || 1)) {
    error('WA-004', 'At least one care instruction is required.');
  }

  const dimensions = row.dimensions || {};
  const numericDimensions = ['length', 'width', 'height', 'weight']
    .map((key) => Number(dimensions[key]))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!numericDimensions.length) error('WA-005', 'At least one positive numeric dimension is required.');
  if (!hasText(dimensions.linear_unit) || !hasText(dimensions.weight_unit)) {
    warn('WA-005', 'Dimension units are missing; default metric units were applied.');
  }

  if (!(Number(row.msrp_usd) > 0)) error('WA-006', 'MSRP must be greater than zero.');
  const prices = Array.isArray(row.regional_prices) ? row.regional_prices : [];
  if (prices.length < (config.minRegionalPrices || 1)) {
    error('WA-006', 'At least one regional price is required.');
  } else {
    for (const price of prices) {
      if (!hasText(price?.region) || !hasText(price?.currency) || !(Number(price?.amount) > 0)) {
        error('WA-006', 'Each regional price needs region, currency and amount.');
        continue;
      }
      if (!(taxonomy.allowedCurrencies || []).includes(price.currency)) {
        error('WA-006', `Currency ${price.currency} is not in the allowed currency list.`);
      }
      if (!hasText(price.source_url)) {
        warn('WA-006', `Regional price for ${price.region} has no source URL.`);
      }
    }
  }

  if (!Array.isArray(row.tags) || !row.tags.length) error('WA-007', 'At least one tag is required.');
  if (!Array.isArray(row.compliance_notes) || row.compliance_notes.length < (config.minComplianceNotes || 1)) {
    error('WA-007', 'At least one compliance note is required.');
  } else if (row.compliance_notes.some((note) => !hasText(note?.text))) {
    error('WA-007', 'Every compliance note must contain text.');
  }

  const assets = Array.isArray(row.assets) ? row.assets : [];
  if (assets.length < (config.minAssets || 1)) error('WA-008', 'At least one image asset is required.');
  const officials = assets.filter((asset) => asset?.role === 'official');
  if (!officials.length) error('WA-008', 'At least one official image asset is required.');
  const backups = assets.filter((asset) => asset?.role === 'backup');
  if (backups.length > (config.maxBackupImages || 6)) {
    error('WA-008', 'Too many backup images supplied.');
  }
  if (hasText(row.official_image_url) && !officials.some((asset) => asset.url === row.official_image_url)) {
    error('WA-008', 'official_image_url must match an official asset entry.');
  }

  for (const [index, asset] of assets.entries()) {
    if (!hasText(asset?.url)) {
      error('WA-009', `Asset ${index + 1} has no URL.`);
      continue;
    }
    if (!parsedUrl(asset.url)) {
      error('WA-009', `Asset ${index + 1} URL is not a valid absolute URL.`);
    } else if (isReservedUrl(asset.url, taxonomy)) {
      if (allowTestFixtures) warn('WA-009', `Asset ${index + 1} uses a reserved test URL.`);
      else error('WA-009', `Asset ${index + 1} URL uses a reserved or unauthorised domain.`);
    }
    if (!(taxonomy.allowedAssetLicences || []).includes(asset?.licence)) {
      error('WA-009', `Asset ${index + 1} licence is not in the allowed asset licence list.`);
    }
    if (asset?.authorized !== true) {
      error('WA-009', `Asset ${index + 1} is not explicitly marked authorised.`);
    }
    if (!hasText(asset?.authorizing_party)) {
      error('WA-009', `Asset ${index + 1} has no authorising party.`);
    }
    if (asset?.licence !== 'OWNED' && !hasText(asset?.authorization_reference)) {
      error('WA-009', `Asset ${index + 1} needs an authorisation reference.`);
    }
    const status = asset?.moderation?.status;
    if (!(taxonomy.assetModerationStatuses || []).includes(status)) {
      error('WA-010', `Asset ${index + 1} has an invalid moderation status.`);
    } else if (requireApprovedImages && status !== 'approved') {
      error('WA-010', `Asset ${index + 1} moderation status is '${status}', not 'approved'.`);
    }
    if (requireApprovedImages && status === 'approved' &&
        (!hasText(asset?.moderation?.checked_at) || !hasText(asset?.moderation?.checked_by))) {
      error('WA-010', `Asset ${index + 1} approval needs checked_at and checked_by metadata.`);
    }
  }

  const actualModeration = moderationSummary(row);
  if (row.image_moderation?.status !== actualModeration) {
    warn('WA-010', `Image moderation status ${row.image_moderation?.status} does not match asset statuses (${actualModeration}).`);
  }
  if (requireApprovedImages && actualModeration !== (taxonomy.requiredModerationStatus || 'approved')) {
    error('WA-010', `Row image moderation status must be '${taxonomy.requiredModerationStatus || 'approved'}'.`);
  }

  const searchDocument = row.search_index?.search_document;
  if (!hasText(searchDocument)) error('WA-011', 'Search document is required.');
  if (searchDocument && searchDocument.length > (config.maxSearchTextChars || 8000)) {
    error('WA-011', 'Search document exceeds the configured maximum length.');
  }
  if (!hasText(row.ai_enrichment?.seo?.title) || !hasText(row.ai_enrichment?.seo?.description)) {
    error('WA-011', 'Deterministic SEO title and description are required.');
  }
  if (!Array.isArray(row.cross_sells) || !Array.isArray(row.bundles)) {
    error('WA-011', 'Cross-sells and bundles arrays are required.');
  }
  if (row.ai_enrichment?.seo && !hasText(row.ai_enrichment.provider)) {
    warn('WA-011', 'AI enrichment provider is missing.');
  }

  if (!hasText(row.provenance?.source) || !hasText(row.provenance?.retrieved_at)) {
    error('WA-012', 'Provenance source and retrieval time are required.');
  }
  if (!Array.isArray(row.audit_log) || !row.audit_log.some((entry) => entry?.action === 'create')) {
    error('WA-012', 'A create audit entry is required.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBatch(rows, taxonomy, options = {}) {
  const results = rows.map((row) => ({
    sku: row.sku || null,
    source: row.provenance?.source || null,
    validation: validateAccessory(row, taxonomy, options),
  }));
  const invalid = results.filter((result) => !result.validation.valid);
  return {
    records: rows.length,
    validRecords: rows.length - invalid.length,
    invalidRecords: invalid.length,
    invalid: invalid.slice(0, 100),
    invalidTruncated: invalid.length > 100,
  };
}
