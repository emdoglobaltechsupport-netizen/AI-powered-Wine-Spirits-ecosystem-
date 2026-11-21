import { createHash } from 'node:crypto';
import {
  RESPONSIBLE_DRINKING_NOTICE,
  RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
  detectHarmSignals,
  evaluateResponsibleDrinking,
  validateAiResponse,
  type SommelierAnswer,
} from '@vintora/shared';
import { findProduct } from './catalog.js';

/**
 * Deterministic Phase 1 Sommelier. Phase 2 replaces this with the RAG pipeline
 * described in 06-ai-features.md §3 and §17: multi-model LLM gateway, retrieval
 * over the Neo4j wine knowledge graph, citation enforcement and safety filter.
 *
 * The four-tier policy, prohibited-recommendation check, provenance fields and
 * responsible-drinking notice are enforced now by the shared `validateAiResponse`
 * boundary. This adapter never calls a model or performs an external action.
 */
export function answer(query: string): SommelierAnswer {
  const q = query.toLowerCase();

  let result: Omit<SommelierAnswer, 'safetyNote' | 'actionTier' | 'provenance'>;

  if (/spicy|thai|chilli|curry|mexic/.test(q)) {
    result = {
      answer: 'For heat, reach for high acidity and low tannin — tannin amplifies chilli burn. Try the Riesling Kabinett Trocken from the Rheingau, with lime, slate and enough fruit to cool the palate.',
      citations: ['Rheingau QbA tasting panel', 'PAIRS_WITH(Spicy) graph edge', '4,812 verified reviews'],
      recommendedProductIds: ['sku-1005', 'sku-1006'],
      confidence: 0.93,
    };
  } else if (/rh.ne|syrah|gift|under \$?100/.test(q)) {
    result = {
      answer: 'If Northern Rhône Syrah is your reference, two paths work: Etna Rosso for its savoury, pepper-driven volcanic character, or Barolo Cannubi for rose, tar and similar gravity.',
      citations: ['SIMILAR_TO(Syrah → Nerello Mascalese, Nebbiolo)', 'provenance verification'],
      recommendedProductIds: ['sku-1006', 'sku-1002'],
      confidence: 0.9,
    };
  } else if (/cellar|invest|15 year|vintage/.test(q)) {
    result = {
      answer: 'For a 15-year horizon, buy provenance and structure rather than fashion. Château Margaux 2016 has the tannic architecture and verified bonded custody to reward patience.',
      citations: ['Vault price model (design estimate)', 'liquidity score 88/100 (modelled)', 'provenance chain 99/100'],
      recommendedProductIds: ['sku-1001', 'sku-1002'],
      confidence: 0.88,
    };
  } else {
    result = {
      answer: 'Based on a savoury, structured palate with moderate oak, begin with Barolo Cannubi 2018. Tell me the dish or the occasion and I will narrow it further.',
      citations: ['taste embedding similarity', '300M-edge knowledge graph (design target)', '892 verified tastings'],
      recommendedProductIds: ['sku-1002', 'sku-1006'],
      confidence: 0.84,
    };
  }

  const provenance: SommelierAnswer['provenance'] = {
    promptId: 'sommelier-deterministic-prompt-v1',
    promptVersion: '1.0.0',
    modelKey: 'deterministic-adapter',
    modelVersion: 'phase1-rule-set',
    retrievalSourceIds: result.citations,
    factPacketHash: createHash('sha256').update(result.citations.join('|')).digest('hex'),
    approvalId: null,
  };
  const harmSignals = detectHarmSignals(query);
  const responsible = evaluateResponsibleDrinking({
    correlationId: `sommelier:${createHash('sha256').update(query).digest('hex').slice(0, 16)}`,
    surface: 'recommendation',
    ageGateState: 'checkout_only',
    suggestionCount: result.recommendedProductIds.length,
    harmSignals,
    supportNotice: RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
  });

  const assessment = validateAiResponse({
    surface: 'sommelier',
    text: result.answer,
    citations: result.citations,
    safetyNote: RESPONSIBLE_DRINKING_NOTICE,
    provenance,
  });

  if (!assessment.allowed || !responsible.allowed) {
    return {
      answer: 'I cannot answer that safely from the available sources. Please ask about a grape, a dish, an occasion or a budget.',
      citations: ['AI safety policy: cite-or-abstain'],
      recommendedProductIds: [],
      confidence: 0,
      safetyNote: RESPONSIBLE_DRINKING_NOTICE,
      supportNotice: RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
      responsibleDrinkingCode: responsible.code,
      actionTier: 'recommendation',
      provenance: {
        ...provenance,
        retrievalSourceIds: ['AI safety policy: cite-or-abstain'],
        factPacketHash: createHash('sha256').update(assessment.code).digest('hex'),
      },
    };
  }

  return {
    ...result,
    safetyNote: RESPONSIBLE_DRINKING_NOTICE,
    supportNotice: RESPONSIBLE_DRINKING_SUPPORT_NOTICE,
    responsibleDrinkingCode: responsible.code,
    actionTier: 'recommendation',
    provenance,
  };
}

export function recommendedProducts(ids: string[]) {
  return ids.map(findProduct).filter((p): p is NonNullable<typeof p> => Boolean(p));
}
