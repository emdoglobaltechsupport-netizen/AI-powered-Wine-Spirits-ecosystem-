/* Phase 1 browser-side AI safety mirror of packages/shared/src/ai-safety.ts. */
export var RESPONSIBLE_DRINKING_NOTICE =
  'Please enjoy responsibly. Vintora does not sell to minors. Answers are guidance, not health claims.';

export var RESPONSIBLE_DRINKING_SUPPORT_NOTICE =
  'If alcohol use is a concern, pause and contact a local support service or a healthcare professional.';

export var PROHIBITED_RECOMMENDATION_PATTERNS = [
  '\\b(?:(?:improves?|boosts?|enhances?)\\s+(?:your\\s+)?health|healthier|medical|cures?|treats?|prevents? disease|safe drinking)\\b',
  '\\b(?:guaranteed|risk-free|no risk|certain return|will (?:rise|appreciate|outperform))\\b',
  '\\b(?:drunk|intoxicated|binge|get high|hangover cure)\\b',
  '\\b(?:for kids|for children|target teenagers|underage drinkers)\\b',
  '\\b(?:investment advice|suitability approval|performance guarantee)\\b',
];

export var RECOMMENDATION_LABEL = 'Recommendation · no external action';

export function screenAiText(text) {
  var value = String(text || '');
  var reasons = [];
  if (!value.trim()) reasons.push('missing_text');
  PROHIBITED_RECOMMENDATION_PATTERNS.forEach(function (source) {
    if (new RegExp(source, 'i').test(value)) reasons.push('prohibited_recommendation');
  });
  return { allowed: reasons.length === 0, reasons: reasons };
}

export function screenAiReply(reply, fallbackText) {
  var screened = screenAiText(reply.text);
  var result = Object.assign({}, reply);
  result.actionTier = 'recommendation';
  result.tierLabel = RECOMMENDATION_LABEL;
  result.supportNotice = RESPONSIBLE_DRINKING_SUPPORT_NOTICE;
  if (!screened.allowed) {
    result.text = fallbackText || 'I cannot give that recommendation from the available sources.';
    result.ids = [];
    result.source = 'Sources: AI safety policy · cite-or-abstain';
    result.blocked = true;
  }
  return result;
}
