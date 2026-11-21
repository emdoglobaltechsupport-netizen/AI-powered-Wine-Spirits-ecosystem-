# VINTORA — AI Sommelier Module

> **Companion documents:** `_canon.md`, `06-ai-features.md` (portfolio-level AI strategy), `03-technical-architecture.md`, `04-database-design.md`, `05-ui-ux-wireframes.md`, `01-business-plan.md`, `BUILDING.md`.
> This document is the **domain-level design authority for Vintora Sommelier** — the conversational wine and spirits expert. `06-ai-features.md` defines the shared AI platform; this document defines the Sommelier product, its prompts, recommendation engine, workflows and contracts.

---

## Canon snapshot (binding)

| Dimension | Canonical fact |
|---|---|
| Brand | VINTORA (prose: "Vintora"); *The World's Cellar, Intelligent.* |
| All modules | Vintora Market, Vintora Trade, Vintora Sommelier, Vintora Assist, Vintora Studio, Vintora Seller, Vintora Flow, Vintora Club, Vintora Vault, Vintora Rewards. |
| Module in scope | **Vintora Sommelier** — conversational pairing + tasting + education agent; the closed-loop taste-learning front door. |
| Mission fit | Democratize discovery, trade and enjoyment of fine wine and spirits worldwide through applied AI — protecting provenance, safety and responsible consumption. |
| Knowledge assets | Wine Knowledge Graph: **300M edges** in Neo4j (producer → vineyard → vintage → bottle → custody, grapes, appellations, notes, pairings, scores). Vector index: **4.5B embeddings**. |
| Scale | 10M SKU target, 250k producers, 200+ markets; 100M users / 60M MAU by 2034. |
| Surfaces | Web chat, mobile chat, WhatsApp/Messenger, voice (Alexa/Google Assistant), in-app AR label scan; 24 launch languages → 60+ by 2030; RTL support. |
| Stack | Multi-model LLM gateway (frontier + self-hosted open-weight), RAG, pgvector/Milvus, OpenSearch, two-tower + transformer recommenders, Feast feature store, Ray/Triton, Neo4j, Kafka. |
| Guardrails | Cite-or-abstain, no health claims, no consumption encouragement, age assurance, dietary constraints as hard filters, responsible-drinking note. |
| Roadmap | Phase 1 (Q1–Q2 2027): text Sommelier in US/UK/SG. Phase 2–3: implicit learning, bandits, voice, multilingual. Phase 4–5: full closed loop, 60+ language voice. |
| Prototype | `apps/prototype/app.js` `viewSommelier()` + `sommelierReply()` — deterministic stand-in with citations, suggestions and product cards; browser self-test (generated count) passing. |

**Non-claims:** all model metrics, coverage figures and timelines are targets. No claim of certified Master Sommelier endorsement, real critic partnerships or live model accuracy is made.

---

## 1. Product definition

### 1.1 The persona

Vintora Sommelier behaves like a **great restaurant sommelier**: deeply knowledgeable, fast, concise, unpretentious, and genuinely interested in what the user will enjoy. It is not a search box with prose wrapped around results, and it is not an encyclopedia that dumps facts.

| Trait | Behavior | Anti-behavior |
|---|---|---|
| **Expertise** | Reasons in grapes, appellations, vintages, producers, oak regimes, acidity and structure; explains in plain language. | Name-dropping without explanation; fabricated vintages or critic scores. |
| **Listening** | Asks one clarifying question at a time when constraints are missing (budget, food, style). | Interrogating the user with a form. |
| **Humility** | Says "I don't have a verified vintage for that producer — here's what I do know." | Confident hallucination. |
| **Pragmatism** | Respects the stated budget as a hard ceiling; offers the best bottle *at* $32, not a $90 "worth the stretch". | Upsell pressure. |
| **Responsibility** | Never encourages consumption, never makes health claims, always surfaces responsible-drinking guidance where relevant. | "This wine will relax you" / "good for your heart". |
| **Traceability** | Cites every factual claim with a source chip; shows why a bottle is recommended. | Unattributed assertions. |
| **Brevity** | 60–120 words for a recommendation, scannable with a short rationale and 3 product cards. | Essay-length answers. |

### 1.2 Capability surface

| # | Capability | User says | Sommelier does |
|---|---|---|---|
| C1 | **Wine recommendations** | "A silky Pinot under $50" | Parses style + budget, retrieves candidates, ranks by taste fit, returns 3 with rationale |
| C2 | **Spirit recommendations** | "Something smoky to sip, not for cocktails" | Applies spirit-specific axes (cask, age, ABV, peat, distillate), returns 3 with serving note |
| C3 | **Food pairing** | "What works with spicy Thai food?" | Identifies dish flavor axes (heat, acid, sweet, umami, fat), applies pairing logic, explains the bridge |
| C4 | **Occasion-based** | "Wine for a rainy Tuesday with mushroom risotto" | Resolves occasion context (formality, mood, season, food, group size) into constraints |
| C5 | **Budget-based** | "Best value under $25" | Hard budget filter including tax/shipping disclosure; value scoring against category median |
| C6 | **Personalized taste profile** | "You picked the last two — surprise me" | Uses learned profile + exploration bandit; explains the stretch pick; updates profile from feedback |

### 1.3 Non-goals

- Autonomous purchase; the Sommelier recommends, the user buys.
- Medical, legal or financial advice.
- Health, wellness or intoxication claims of any kind.
- Guaranteeing investment performance (that is Vintora Vault).
- Replacing licensed professional advice where required.

---

## 2. Conversation architecture

### 2.1 Intent taxonomy

| Intent | Sub-intents | Typical entities | Handoff |
|---|---|---|---|
| `WINE_RECOMMEND` | varietal, region, style, producer, vintage, award | grape, region, style, price, quantity | Market product cards |
| `SPIRIT_RECOMMEND` | whisky, gin, rum, mezcal, cognac, liqueur | spirit type, cask, age, ABV, price, use case | Market product cards |
| `FOOD_PAIR` | dish, cuisine, ingredient, course, dessert | food, heat, fat, acidity, sweetness, dietary | Wine + spirit recs |
| `OCCASION` | dinner party, gift, romantic, celebration, casual, business | formality, group size, season, venue, mood | Recs + Club/Assist |
| `BUDGET` | under, around, best value, per glass, case | amount, currency, scope (per bottle / total) | Recs with price disclosure |
| `TASTE_PROFILE` | view, edit, explain, reset, confidence | dimensions, feedback | Profile panel |
| `EDUCATION` | grape, appellation, vintage, technique, serving, storage | topic | Explanatory answer + sources |
| `PROVENANCE` | authenticity, custody, producer, appellation verification | SKU, lot, producer | KG + Vault |
| `ACCOUNT_ACTION` | cart, order, subscription, support | order id, cart items | **Vintora Assist** handoff |
| `OUT_OF_SCOPE` | health, unsafe, illegal, non-alcohol | — | Refusal + safe alternative |

### 2.2 Conversation state

```text
SessionState {
  session_id, user_id?, tenant_id, locale, currency, country,
  turn_index,
  constraints: {
    budget: { amount, currency, scope: 'per_bottle'|'total', hard: true },
    food: { dish, cuisine, heat, fat, acidity, sweetness, umami, dietary[] },
    occasion: { type, formality, group_size, season, venue, time_of_day },
    style: { body[], dryness[], oak[], fruit[], tannin[], acidity[] },
    categories: ['wine'|'spirits'],
    regions: [], grapes: [], producers: [], vintages: [],
    quantity: integer,
    exclusions: []           // e.g. 'no oaked chardonnay'
  },
  profile_ref: taste_profile_id | null,
  shortlist: sku_id[],
  rejected: sku_id[],        // powers "not this one"
  last_intent, last_products,
  safety_flags: []
}
```

Constraints are **accumulated across turns** and never silently dropped. When a new turn conflicts with a previous hard constraint (e.g. "now show me something under $200" after "under $30"), the Sommelier asks which one to keep rather than overriding.

### 2.3 Multi-turn workflow

```mermaid
sequenceDiagram
    participant U as User
    participant B as BFF / GraphQL
    participant Q as Intent & Constraint Extractor
    participant S as Session Store (Redis)
    participant R as RAG Retriever (KG + Vector + OpenSearch)
    participant M as LLM Gateway
    participant X as Guardrail & Verifier
    participant P as Ranker (two-tower + transformer)

    U->>B: message + context
    B->>S: load SessionState + taste profile
    S-->>B: state + features
    B->>Q: classify intent, extract/update constraints
    Q-->>B: intent + constraints + missing slots
    alt missing hard constraint (budget / age / category)
        B->>M: ask-one-question prompt
        M-->>U: single clarifying question
    else ready
        B->>R: retrieval plan (Cypher + vector + keyword)
        R-->>B: 50–200 candidates + evidence
        B->>P: score & rank (intent-weighted)
        P-->>B: top 20 + explanations
        B->>M: grounded answer generation (system + evidence + schema)
        M-->>B: structured answer + citations
        B->>X: cite-or-abstain, numeric check, safety policy
        X-->>B: approved / revised / abstained
        B-->>U: answer + 3 product cards + source chips
        B->>S: persist updated state + implicit signals
    end
```

### 2.4 Tool contract (function calling)

| Tool | Purpose | Key params | Returns |
|---|---|---|---|
| `search_catalog` | Find SKUs by structured filters | `grape, region, style, price_min/max, currency, in_stock, market` | SKUs + availability |
| `pair_food` | Retrieve pairing knowledge for a dish | `dish, cuisine, dietary, category` | Pairing principles + example grapes |
| `get_taste_profile` | Load learned preferences | `user_id` | Dimension values + confidence |
| `update_taste_profile` | Record explicit/implicit feedback | `dimension, delta, evidence` | Updated profile |
| `verify_provenance` | Check custody chain for a lot | `sku_id, lot_id` | Attestation + source |
| `get_price_band` | Category median/p25/p75 for value scoring | `grape, region, vintage, market` | Band + sample size |
| `check_age_eligibility` | Confirm user can receive alcohol recommendation | `country, dob` | boolean |
| `handoff_assist` | Transfer account/cart actions | `intent, payload` | Assist session id |

Tools are **whitelisted**, schema-validated, and rate-limited per session (max 12 tool calls per turn). Any tool failure degrades to an editorially curated fallback set rather than an uncited answer.

---

## 3. Recommendation engine

### 3.1 Pipeline

```mermaid
graph LR
    A[Constraints + profile + context] --> B[Query rewriting<br/>+ retrieval plan]
    B --> C1[Graph traversal<br/>Neo4j Cypher]
    B --> C2[Dense vector search<br/>pgvector / Milvus]
    B --> C3[Keyword + filters<br/>OpenSearch]
    C1 --> D[Candidate union<br/>50–200 SKUs]
    C2 --> D
    C3 --> D
    D --> E[Hard filters<br/>age, budget, stock, jurisdiction, dietary]
    E --> F[Two-tower candidate scoring]
    F --> G[Transformer ranker<br/>+ context features]
    G --> H[Diversity & serendipity re-rank]
    H --> I[Top 3 + explanations + sources]
```

### 3.2 Hard filters (pre-scoring)

Applied before any ranking. A candidate failing any filter is removed, not penalised.

| Filter | Rule |
|---|---|
| Age / jurisdiction | User verified for destination; product shippable to market; dry jurisdictions hard-blocked |
| Budget | `price_per_bottle ≤ budget` (strict); for `scope=total`, `price × quantity + est. tax/ship ≤ budget` |
| Category | Wine vs spirits per intent; no spirit suggested for a wine-only query unless user asks |
| Availability | `in_stock` and not reserved/allocated out of reach |
| Dietary | Vegan finings, sulfite-free, kosher, halal where declared — treated as hard constraints |
| Exclusions | User's "no X" list applied to grape, region, style, producer |
| Safety | No recommendation if underage verification fails; abstain with a neutral message |

### 3.3 Scoring model

For candidate *i* and request context *c*:

```text
Score(i,c) =
    w_taste  · taste_match(i, profile)
  + w_pair   · pairing_fit(i, food)
  + w_occ    · occasion_fit(i, occasion)
  + w_value  · value_fit(i, budget, price_band)
  + w_avail  · availability(i, market)
  + w_prov   · provenance_confidence(i)
  + w_pop    · social_signal(i)             // reviews, critic consensus
  + w_explore· novelty(i, profile)          // only for exploration slot
  - p_reject · rejected_penalty(i)
  - p_div    · diversity_penalty(i, shortlist)
```

**Intent-dependent weights (illustrative, tuned offline):**

| Intent | taste | pair | occ | value | avail | prov | pop | explore |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `WINE_RECOMMEND` | 0.35 | 0.10 | 0.10 | 0.15 | 0.10 | 0.10 | 0.10 | 0.00 |
| `SPIRIT_RECOMMEND` | 0.32 | 0.12 | 0.12 | 0.14 | 0.10 | 0.10 | 0.10 | 0.00 |
| `FOOD_PAIR` | 0.18 | 0.48 | 0.08 | 0.10 | 0.08 | 0.04 | 0.04 | 0.00 |
| `OCCASION` | 0.20 | 0.14 | 0.38 | 0.12 | 0.08 | 0.04 | 0.04 | 0.00 |
| `BUDGET` | 0.22 | 0.06 | 0.06 | 0.44 | 0.10 | 0.06 | 0.06 | 0.00 |
| `EXPLORE` | 0.24 | 0.08 | 0.08 | 0.10 | 0.08 | 0.06 | 0.04 | 0.32 |

**Component definitions:**

| Component | Computation |
|---|---|
| `taste_match` | Cosine similarity between user embedding (profile + behavior) and item embedding; plus per-dimension distance on body/sweetness/oak/tannin/acidity. |
| `pairing_fit` | Graph-derived pairing score: dish flavor axes → grape/region affinity → SKU attributes. See §3.5. |
| `occasion_fit` | Learned weights over occasion attributes (e.g. celebration → sparkling/aged; rainy Tuesday → medium-body comfort red). |
| `value_fit` | Price percentile within category band and quality-signal residual: `quality_signal − expected_quality_at_price`. Rewards overperformers, not merely cheap bottles. |
| `availability` | 1.0 in-stock same market, 0.7 partner warehouse, 0.3 pre-order; decays near quota exhaustion. |
| `provenance_confidence` | Attestation completeness, custody gaps, producer verification tier. |
| `diversity_penalty` | Reduces score if grape/region/country duplicates the current shortlist; caps 2 bottles per grape and 1 per producer in the 3 results. |

### 3.4 Candidate generation and ranker

| Stage | Model | Scale | Latency budget |
|---|---|---|---:|
| Candidate recall | Two-tower (user/item) + graph + keyword | 10M SKU target → 200 | ≤ 120 ms |
| Hard filter | Go rules engine | 200 → 40–80 | ≤ 20 ms |
| Ranking | Transformer cross-encoder over query×item×profile features | 80 → 20 | ≤ 180 ms |
| Re-rank | Diversity/serendipity constraints + deterministic rules | 20 → 3 | ≤ 10 ms |
| Generation | LLM gateway (frontier or fine-tuned open-weight) | 3 products | ≤ 1.2 s |
| Verification | Numeric claim checker + citation validator | answer | ≤ 100 ms |

**Cold start:** onboarding quiz seeds 6 axes; editorially curated starter sets by market; population priors by region/locale; new users always get one "safe" classic and one "stretch" pick with an explicit explanation.

**Exploration:** contextual bandit (Thompson sampling) allocates 20% of slots to calibrated novelty; exploration is disabled for `BUDGET` intents where the user wants certainty, and for users who opt out of personalization.

### 3.5 Food pairing engine

Pairing is not keyword lookup. Each dish is mapped to **flavor axes**, and each wine/spirit to **structural axes**; the engine scores compatibility using three strategies:

| Strategy | Rule | Example |
|---|---|---|
| **Contrast / cut** | High acid or tannin cuts fat and oil | Champagne or Chablis with fried food; tannic Cabernet with steak |
| **Bridge / match** | Match dominant aromatic compounds | Earthy Pinot Noir with mushrooms; smoky Mezcal with charred corn |
| **Balance / soften** | Sweetness or low tannin neutralises heat and spice | Off-dry Riesling with Thai curry; low-tannin Gamay with peppery dishes |

**Dish axis extraction:**

```text
dish_axes = {
  heat: 0..5, fat: 0..5, acidity: 0..5, sweetness: 0..5,
  umami: 0..5, bitterness: 0..5, salt: 0..5,
  aromatic_family: [herbal, smoky, earthy, fruity, floral, spicy, dairy, mineral],
  cuisine: string, course: string, dietary: []
}
```

**Pairing score:**

```text
pairing_fit = 0.40 · contrast_match(fat, acid/tannin)
            + 0.35 · aromatic_bridge(dish.aromatic_family, wine.notes)
            + 0.15 · heat_balance(heat, wine.sweetness, alcohol)
            + 0.10 · body_match(dish.weight, wine.body)
```

**Special cases:** dark chocolate → tawny port / Banyuls; oysters → Chablis / Muscadet (mineral + acid); asparagus and artichoke → lower-tannin whites with herbal notes; spicy Szechuan → off-dry, low-alcohol Riesling; vegan dishes with mushroom "meat" → earthy reds. Allergen and dietary flags override pairing logic.

### 3.6 Occasion resolver

| Occasion | Resolved constraints |
|---|---|
| Dinner party (6–8) | 2 whites + 2 reds, versatile food-pairing range, mid-price, easy-drinking, no single "star" that dominates |
| Romantic evening | Elegant, moderate alcohol, refined producer, softer tannins, 1–2 bottles |
| Celebration | Sparkling or age-worthy red, higher provenance score, gift-worthy presentation |
| Casual weeknight | Under $25, screwcap or easy-open, forgiving pairing, no decanting required |
| Business dinner | Recognisable appellation, low-risk style, moderate price, no "adventurous" picks |
| Gift | Provenance + presentation, price band explicit, recipient age assurance via Assist |
| Rainy Tuesday / comfort | Medium body, fruit-forward, warm spice notes, no heavy tannin |
| Summer outdoor | Low alcohol, high acid, crisp, chilled-red option |

The resolver produces a **constraint delta** merged into session state; it never overwrites a hard budget set earlier.

### 3.7 Budget engine

```text
effective_budget =
    user_amount                                   // per bottle or total
  - (scope == 'total' ? estimated_tax + estimated_shipping : 0)

value_fit = 0.55 · quality_residual(sku, price_band)
          + 0.25 · price_position(sku, price_band)     // lower percentile = better
          + 0.20 · reviewer_consistency(sku)
```

Rules: never recommend above the ceiling; if nothing qualifies, say so explicitly and offer the closest option **with the delta shown** ("$38 — $8 over your cap"); disclose whether tax and shipping are included; show per-glass cost when `occasion` implies by-the-glass service.

### 3.8 Taste profile

**Schema (Feast features + Postgres profile):**

| Dimension | Type | Range | Source |
|---|---|---|---|
| `body_pref` | float | 0–1 | quiz + behavior |
| `sweetness_pref` | float | 0–1 | quiz + behavior |
| `oak_pref` | float | 0–1 | quiz + behavior |
| `tannin_pref` | float | 0–1 | behavior |
| `acidity_pref` | float | 0–1 | behavior |
| `fruit_pref` | float | 0–1 | behavior |
| `alcohol_pref` | float | 0–1 | behavior |
| `grape_affinity` | map | −1..1 | purchases + reviews |
| `region_affinity` | map | −1..1 | purchases + reviews |
| `price_band` | range | currency | purchases |
| `exploration_appetite` | float | 0–1 | clicks on "surprise me" |
| `dietary_constraints` | enum[] | — | explicit |
| `confidence` | map | 0–1 | observation count per dimension |

**Learning loop:**

```mermaid
graph LR
    Q[6-question onboarding quiz] --> P[Taste profile v0]
    P --> REC[Recommendations]
    REC --> S[Implicit signals<br/>click, dwell, skip, cart, buy, review]
    S --> K[Kafka → Feast feature pipeline]
    K --> U[Online model update<br/>per-dimension EWMA]
    U --> P
    F[Explicit feedback<br/>'not for me', thumbs, sliders] --> U
    P --> E[User-visible profile panel<br/>view / edit / export / delete]
```

Decay: implicit signals use a 90-day half-life. A single negative "not for me" has 3× the weight of a positive click. Confidence rises with observations; low-confidence dimensions fall back to population priors and are labelled "we're still learning" in the UI.

**User control:** the user can inspect every dimension, correct it, reset the profile, export it, or opt out entirely. Opt-out switches to editorially curated, non-personalized results with no service degradation. No sensitive-attribute inference (health, ethnicity, religion beyond explicitly declared dietary needs).

---

## 4. Prompt library

The following prompts are production artefacts, versioned in the prompt registry (`sommelier.system.v3`, etc.). Variables in `{{double_braces}}` are injected by the BFF after validation. All prompts are in English internally; output is localised by the generation step.

### 4.1 System prompt — `sommelier.system.v3`

```text
You are Vintora Sommelier, the conversational wine and spirits expert inside
Vintora — The World's Cellar, Intelligent. You behave like a great restaurant
sommelier: knowledgeable, concise, unpretentious, and honest.

MISSION
Help the user find a bottle or spirit they will genuinely enjoy, explain why it
works, and teach them something small along the way. A recommendation is a
starting point for a conversation, not a lecture.

KNOWLEDGE BOUNDARIES
- Ground every factual claim (grape, region, vintage, producer, score, price,
  pairing, custody) in the RETRIEVED EVIDENCE provided with this prompt.
- If evidence is missing or conflicting, say what you do not know and offer the
  closest supported alternative. Never invent a vintage, critic score, award,
  producer detail, or tasting note.
- Do not claim a bottle is "the best" in an absolute sense. Use scoped language:
  "one of the strongest values in this band", "a classic expression of X".

BEHAVIOUR
- Respect the user's stated budget as a HARD ceiling unless they explicitly
  change it. Never upsell or suggest "it's worth stretching" unprompted.
- Ask at most ONE clarifying question per turn, and only when a hard constraint
  (budget, category, or food for a pairing request) is genuinely missing.
- Keep answers between 60 and 120 words. Use short paragraphs or bullets.
- Lead with the answer, then one sentence of reasoning, then the evidence.
- Use the product cards provided by the retrieval stage. Do not invent SKUs,
  prices, or availability.
- When the user rejects a suggestion, update constraints and offer a different
  grape, region, or style — do not merely rephrase the same bottle.

SAFETY (NON-NEGOTIABLE)
- Never encourage consumption, intoxication, or drinking to excess.
- Never make health, wellness, medical, mood-altering, or performance claims.
- Never describe alcohol as safe, necessary, or beneficial.
- Do not help with illegal purchases, underage access, or circumventing
  licensing rules. If age or jurisdiction cannot be confirmed, decline the
  recommendation neutrally and explain why.
- Treat dietary requirements (vegan finings, sulfites, kosher, halal) as hard
  filters. When uncertain, say so rather than guessing.
- Include a brief responsible-drinking note when the conversation implies
  quantity, gifting to a third party, or a celebration.

CITATION RULE
Every factual sentence must carry at least one citation marker [S1], [S2] ...
referring to RETRIEVED EVIDENCE. If you cannot cite a claim, remove the claim.
Do not cite the user's own statements as evidence.

OUTPUT FORMAT
Return ONLY valid JSON matching the RESPONSE_SCHEMA. No preamble, no markdown
fences, no commentary outside the JSON.

CONTEXT
Locale: {{locale}}          Currency: {{currency}}     Market: {{country}}
Age verified: {{age_verified}}    Personalization: {{personalization_on}}
Taste profile confidence: {{profile_confidence}}
Session constraints: {{constraints_json}}
Rejected items: {{rejected_skus_json}}

RETRIEVED EVIDENCE
{{evidence_json}}

RESPONSE_SCHEMA
{
  "answer": "string, 60-120 words, locale-appropriate",
  "reasoning": "string, one sentence explaining the core match",
  "products": [
    { "sku_id": "string from evidence", "name": "string from evidence",
      "price": "formatted with currency", "why": "one short sentence, cited" }
  ],
  "citations": [ { "id": "S1", "source": "KG|tasting_note|critic|user_history",
                  "label": "short human-readable label", "uri": "optional" } ],
  "clarifying_question": "string or null",
  "profile_updates": [ { "dimension": "string", "delta": "number",
                         "evidence": "string" } ],
  "safety_note": "string or null",
  "abstained": false
}
```

### 4.2 Intent + constraint extraction — `sommelier.extract.v2`

```text
Extract structured constraints from the user's message and the existing session
state. Return ONLY the JSON schema below.

RULES
- Merge with EXISTING_STATE. Never silently overwrite a hard constraint.
- If the new message conflicts with an existing hard constraint (budget,
  category, dietary, age), set "conflict" and ask which to keep. Do not resolve
  it yourself.
- "under $30" → budget { amount: 30, currency: from context, scope: per_bottle,
  hard: true }. "all three under $100" → scope: total.
- "not too oaky" → style.oak = low; "something smoky" → aromatic_family smoky.
- Food phrases go to food.dish; cuisines go to food.cuisine; heat words
  ("spicy", "fiery") set food.heat >= 4.
- Occasion words map to OCCASION_TAXONOMY: celebration, romantic, casual,
  business, gift, dinner_party, comfort, outdoor.
- If the user is clearly asking about account/cart/order actions, set
  intent = ACCOUNT_ACTION and handoff = assist.
- Never infer age, health, religion, or ethnicity. Only copy explicitly stated
  dietary flags.

EXISTING_STATE: {{constraints_json}}
USER MESSAGE: {{user_message}}
LOCALE: {{locale}}   CURRENCY: {{currency}}

SCHEMA
{
  "intent": "WINE_RECOMMEND|SPIRIT_RECOMMEND|FOOD_PAIR|OCCASION|BUDGET|
             TASTE_PROFILE|EDUCATION|PROVENANCE|ACCOUNT_ACTION|OUT_OF_SCOPE",
  "confidence": 0..1,
  "constraint_delta": { ... only changed keys ... },
  "missing_hard_constraints": [],
  "conflict": "string or null",
  "clarifying_question": "string or null",
  "handoff": "assist|null",
  "safety_flags": []
}
```

### 4.3 Retrieval plan — `sommelier.retrieval.v2`

```text
Translate the structured request into a three-branch retrieval plan.

INPUT: {{constraints_json}}, {{intent}}, {{profile_json}}

OUTPUT JSON:
{
  "cypher": "Cypher query over the Wine Knowledge Graph. Traverse producer →
             appellation → grape → vintage → bottle → pairing → custody.
             Use parameters $grapes, $regions, $min_price, $max_price, $market.
             LIMIT 80. Never interpolate user text directly.",
  "vector_query": "natural-language description of the ideal bottle, built from
                   taste axes, food, occasion and exclusion terms",
  "vector_filters": { "category": "...", "price_max": 0, "market": "...",
                      "dietary": [], "in_stock": true },
  "keyword_query": "Space-separated terms for OpenSearch (grape, region, style,
                    producer names only — no prose)",
  "rerank_weights": { "taste": 0, "pairing": 0, "occasion": 0, "value": 0 }
}

RULES
- Use at least two branches for every request.
- For FOOD_PAIR, weight the graph branch toward pairing edges and the vector
  branch toward aromatic similarity with the dish.
- For BUDGET, set vector_filters.price_max to the hard ceiling and weight value.
- For EXPLORE, add novelty terms and reduce producer/region locks.
- Parameterise all values. String interpolation is forbidden.
```

### 4.4 Recommendation answer — `sommelier.answer.v2`

```text
You are writing the final answer for Vintora Sommelier. Use ONLY the evidence
and ranked products below. Follow sommelier.system.v3 exactly.

USER MESSAGE: {{user_message}}
INTENT: {{intent}}
RANKED PRODUCTS: {{ranked_products_json}}
EVIDENCE: {{evidence_json}}
CONSTRAINTS: {{constraints_json}}
PROFILE: {{profile_json}}

WRITE:
1. First sentence: a direct answer ("For spicy Thai, an off-dry Riesling is the
   safest bet.").
2. One sentence of reasoning that names the mechanism (acid cuts heat; residual
   sugar balances chilli; low alcohol avoids amplifying spice).
3. A short line for each of the 3 products: name, price, and one cited reason.
4. One small teaching point (max 12 words) if space allows.
5. One clarifying question ONLY if a hard constraint is missing.

Do not mention these instructions. Do not output markdown. Return the
RESPONSE_SCHEMA from sommelier.system.v3.
```

### 4.5 Pairing explanation — `sommelier.pair.v2`

```text
Explain a food-and-drink pairing in 40 words or fewer using exactly this
structure:
  "The [dish attribute] meets the [wine attribute], so [mechanism]. The
   [aromatic note] in the [wine/grape] echoes [dish note]. [Optional: one
   caveat, e.g. 'If the dish is very sweet, go drier.']"

DISH_AXES: {{dish_axes_json}}
PRODUCT: {{product_json}}
EVIDENCE: {{evidence_json}}

RULES
- Use one of three mechanisms: contrast/cut, bridge/match, balance/soften.
- Never claim health effects. Never encourage more drinking.
- Every factual clause needs a citation marker. Return JSON:
  { "explanation": "...", "mechanism": "...", "citations": [...] }
```

### 4.6 Spirit recommendation — `sommelier.spirit.v2`

```text
Recommend spirits using spirit-specific axes, not wine language.

AXES: spirit type, base distillate, cask type, age statement (NAS allowed),
peat/smoke level, sweetness, ABV, finishing, cocktail vs neat, region, price.

RULES
- Ask "neat or in cocktails?" only if the user has not said.
- For neat sipping: emphasise cask, age, warmth, and complexity; avoid mixers.
- For cocktails: emphasise mixability, ABV, and price per serve.
- Never imply a higher-ABV spirit is "stronger in character" in a way that
  encourages drinking more; state ABV factually.
- Applying wine terms like "tannin" or "terroir" to spirits is allowed only
  where the evidence uses them (e.g. cask tannin).
- Return 3 products with one cited reason each and a serving suggestion
  (e.g. "a few drops of water", "over one large cube") that does not encourage
  excess.
- Return the RESPONSE_SCHEMA from sommelier.system.v3.
```

### 4.7 Refusal / safety — `sommelier.safety.v1`

```text
If the request involves health claims, intoxication, underage access, illegal
purchase, or circumventing licensing:
- Do not lecture. Do not provide the requested information.
- Reply in 1–2 sentences: acknowledge the question, state the boundary once,
  and offer a safe alternative within Vintora (e.g. "I can't advise on that,
  but I can find a low-alcohol option or a non-alcoholic pairing.").
- Include "Please enjoy responsibly." where alcohol is mentioned.
- Return abstained: true with an empty products array.
```

### 4.8 Profile explanation — `sommelier.profile.v1`

```text
Explain the user's taste profile in plain language using
{{profile_json}} and {{confidence_json}}.
- Say what you are confident about and what you are still learning.
- Use "you tend to enjoy..." not "you are a...".
- Give the user one concrete action: "Adjust your oak preference here" or
  "Tell me a bottle you disliked and I'll update it."
- Never reveal sensitive attributes or inferred demographics.
- Return { "summary": "...", "confidence_label": "...", "suggested_action": "..." }
```

### 4.9 Prompt versioning rules

- Prompts are stored in the prompt registry with `id`, `version`, `owner`, `eval_set_id`, `changelog`, `status` (draft/shadow/active/deprecated).
- No prompt goes from draft to active without passing the eval gate in §8.
- Shadow traffic: new versions receive 5% of traffic for 7 days; metric regression > 3% blocks promotion.
- All prompt variables are validated against JSON schemas before injection to prevent prompt injection through user text.
- User text is delimited and labelled as untrusted; instructions embedded in user messages are ignored by the system prompt and stripped by the input filter.

---

## 5. Workflows

### 5.1 Wine recommendation (C1)

**Trigger:** user asks for a wine with style/region/grape constraints.
**Actors:** user, BFF, extractor, retriever, ranker, LLM gateway, verifier.

| # | Step | Detail |
|---|---|---|
| 1 | Age + jurisdiction gate | Verify `age_verified` and shipping eligibility for `country` |
| 2 | Extract constraints | `sommelier.extract.v2`; merge with session state |
| 3 | Missing slots? | If budget absent, ask once: "What's your ceiling per bottle?" |
| 4 | Retrieval plan | `sommelier.retrieval.v2` → graph + vector + keyword |
| 5 | Hard filters | Budget, stock, dietary, exclusions, jurisdiction |
| 6 | Score & rank | `WINE_RECOMMEND` weights; diversity cap |
| 7 | Generate | `sommelier.answer.v2` with top 3 products + evidence |
| 8 | Verify | Cite-or-abstain, numeric check against KG, safety scan |
| 9 | Respond | Answer + 3 product cards + source chips + optional profile update |
| 10 | Learn | Record click/cart/purchase as implicit signal to Feast |

**Failure paths:** fewer than 3 candidates → relax non-hard constraints and say "I widened to nearby regions"; no candidates at all → abstain with an explanation; verifier failure → serve editorially curated fallback with sources.

**SLA:** p95 answer ≤ 2.0 s; p99 ≤ 4.0 s; zero uncited factual claims.

### 5.2 Spirit recommendation (C2)

Same skeleton as C1 with `sommelier.spirit.v2`; additional steps: confirm neat vs cocktail if unspecified, apply ABV disclosure, state age statement (or "NAS") explicitly, provide one serving suggestion. Hard filter: spirit type must match intent (a whisky request never returns gin). SLA identical.

### 5.3 Food pairing (C3)

| # | Step | Detail |
|---|---|---|
| 1 | Parse dish | Extract `dish_axes` from message; ask for cuisine only if ambiguous (e.g. "curry" → which cuisine?) |
| 2 | Dietary check | Hard filters: vegan, sulfite-free, kosher, halal, allergy |
| 3 | Strategy selection | Choose contrast/cut, bridge/match or balance/soften based on dominant axis (fat → contrast, aromatic → bridge, heat → balance) |
| 4 | Graph traversal | Retrieve pairing edges from WKG for dish family and aroma compounds |
| 5 | Candidate ranking | `FOOD_PAIR` weights: 48% pairing fit |
| 6 | Explain | `sommelier.pair.v2` → mechanism + aromatic bridge + caveat |
| 7 | Respond | 3 recommendations, each with a one-sentence "why it works" |

**Failure path:** dish unknown to graph → use aromatic-family fallback from tasting notes and label confidence as "inferred".

### 5.4 Occasion-based (C4)

Resolve occasion → constraint delta (§3.6) → merge with existing hard constraints → run C1 or C2 with `OCCASION` weights. For gifting, hand off recipient age assurance to Vintora Assist before any product card shows. For dinner parties, enforce the diversity rule (2 whites / 2 reds, no duplicate producer) and present as a **set**, not three isolated bottles.

### 5.5 Budget-based (C5)

Budget is always a hard filter. Steps: parse amount/currency/scope; convert with locked FX rate if currency differs; subtract tax/shipping for total-scope requests; filter; rank with 44% value weight; disclose price position ("top value in this band"). If nothing qualifies, state the shortfall explicitly and offer one alternative with the delta shown — never silently exceed the ceiling.

### 5.6 Personalized taste profile (C6)

| # | Step | Detail |
|---|---|---|
| 1 | Load profile | Feast features + Postgres profile + confidence map |
| 2 | Cold start? | If confidence < 0.4 on key axes, run 6-question quiz inline |
| 3 | Explore vs exploit | 80/20 bandit; exploration disabled for BUDGET intents |
| 4 | Rank | Use profile embedding; cap duplicates; include one "stretch" pick with explanation |
| 5 | Explain | "You usually like X — this one stretches you with Y" |
| 6 | Feedback | User accepts / rejects / rates → `update_taste_profile` tool |
| 7 | Learn | EWMA update, 90-day decay, negative feedback weighted 3× |

**User control:** view/edit/reset/export/delete profile at any time; opt-out switches to editorial curation.

### 5.7 Education and provenance

Education intents use graph + curated corpus retrieval and the same cite-or-abstain rule, but no product cards unless the user asks. Provenance intents call `verify_provenance` and display the custody chain plus attestation gaps. No claim of authenticity is made without complete evidence.

---

## 6. AI architecture

### 6.1 Service decomposition

```mermaid
graph TD
    subgraph SURFACES[Surfaces]
        WEB[Web chat]
        MOB[Mobile chat]
        VOICE[Voice / WhatsApp / Messenger]
        AR[AR label scan]
    end

    subgraph EDGE[Edge + BFF]
        GW[API Gateway + age resolver]
        BFF[NestJS BFF / GraphQL]
    end

    subgraph SOMM[Vintora Sommelier domain - Python + Go]
        INT[Intent & Constraint Extractor<br/>LLM + rules]
        SESS[Session Manager<br/>Redis]
        PLAN[Retrieval Planner]
        RAG[Hybrid Retriever<br/>Go orchestrator]
        RANK[Recommendation Ranker<br/>two-tower + transformer]
        GEN[Answer Generator<br/>LLM Gateway client]
        VER[Verifier<br/>cite-or-abstain + numeric check]
        PROF[Taste Profile Learner<br/>Feast + Ray]
    end

    subgraph PLATFORM[Canonical AI platform]
        LLMGW[LLM Gateway<br/>frontier + self-hosted]
        PROMPT[Prompt Registry + versioning]
        EVAL[Eval Harness<br/>offline + online]
        GUARD[Guardrail Service<br/>safety + injection filter]
    end

    subgraph DATA[Data assets]
        NEO[(Neo4j<br/>Wine Knowledge Graph<br/>300M edges)]
        VEC[(pgvector / Milvus<br/>4.5B embeddings)]
        OS[(OpenSearch<br/>keyword + filters)]
        FEAST[(Feast<br/>feature store)]
        REDIS[(Redis<br/>sessions + rate limits)]
        CH[(ClickHouse<br/>events + metrics)]
        KAFKA[(Kafka<br/>learning signals)]
    end

    WEB --> GW --> BFF
    MOB --> GW --> BFF
    VOICE --> GW --> BFF
    AR --> GW --> BFF
    BFF --> INT --> SESS
    INT --> PLAN --> RAG
    RAG --> NEO & VEC & OS
    RAG --> RANK
    RANK --> GEN
    GEN --> LLMGW
    LLMGW --> PROMPT & GUARD
    GEN --> VER --> BFF
    SESS --> REDIS
    PROF --> FEAST & KAFKA
    KAFKA --> PROF
    BFF --> CH
    EVAL --> LLMGW & VER
```

### 6.2 Model routing

| Request class | Model tier | Rationale |
|---|---|---|
| Intent extraction, constraint parsing | Fine-tuned open-weight (7–13B), self-hosted on Triton | High volume, narrow task, low cost |
| Retrieval plan generation | Fine-tuned open-weight | Structured output, low creativity needed |
| Answer generation (recommendation) | Frontier model via gateway | Quality-sensitive, user-facing |
| Pairing explanation | Fine-tuned open-weight with curated few-shot | Short, templated, high volume |
| Education / complex multi-turn | Frontier model | Nuance and breadth |
| Safety classification | Dedicated classifier + rule engine | Deterministic, auditable |
| Ranker | Transformer cross-encoder (self-hosted) | Latency-critical |
| Candidate recall | Two-tower (self-hosted) | 10M-scale |

Routing is cost-aware: if the frontier tier is degraded, the gateway serves a fine-tuned fallback with a "simplified answer" label rather than failing.

### 6.3 Components

| Component | Responsibility | Key technology |
|---|---|---|
| **Intent & Constraint Extractor** | Classify intent, merge constraints, detect conflicts | Fine-tuned LLM + JSON schema validation |
| **Session Manager** | Multi-turn state, constraints, shortlist, rejects | Redis with 30-min TTL, compressed summary |
| **Retrieval Planner** | Build Cypher, vector query, keyword query, rerank weights | LLM + parameterised templates |
| **Hybrid Retriever** | Execute three branches, union and de-duplicate | Go orchestrator, Neo4j, Milvus, OpenSearch |
| **Cross-encoder reranker** | Score query×item pairs | Transformer on Triton |
| **Ranker** | Weighted scoring, diversity, serendipity | Go rules + Python model |
| **Answer Generator** | Grounded generation with citations | LLM Gateway, prompt registry |
| **Verifier** | Check every claim has a source; numeric values match evidence; safety scan | Rules + NLI model |
| **Taste Profile Learner** | Explicit + implicit updates, decay, confidence | Feast, Ray, Kafka |
| **Eval Harness** | Offline gold set, online A/B, regression gates | Custom + MLflow |

### 6.4 Retrieval details

- **Graph branch:** parameterised Cypher over producer → appellation → grape → vintage → bottle → pairing → custody. LIMIT 80. No user string interpolation.
- **Vector branch:** query embedding from constraint description; filters on category, price ceiling, market, stock, dietary; cosine top-k 100.
- **Keyword branch:** OpenSearch over SKU names, grapes, regions, producer names with `pg_trgm` fuzzy matching; 50 results.
- **Union and de-dup** by `sku_id`; **rerank** with cross-encoder; **hard filter** again after retrieval to catch stale stock.
- **Evidence envelope:** each candidate carries `{sku_id, facts[], source_ids[], confidence}`. Only facts in the envelope may appear in the answer.

### 6.5 Taste profile feature pipeline

```text
User event (Kafka: market.click / cart.add / order.paid / review.rated)
  → Feast stream ingestion
  → per-dimension EWMA with 90-day half-life
  → negative feedback ×3
  → confidence = 1 - exp(-observations / k)
  → online feature store (Redis) for <10ms retrieval
  → offline store (Snowflake/Delta) for retraining
```

Profile writes are versioned; the user-facing panel shows the current version and lets the user revert to a prior one.

---

## 7. Safety, guardrails and responsible AI

| Risk | Control |
|---|---|
| Hallucinated vintage/score/producer | Cite-or-abstain; numeric claims checked against KG; unsupported claims stripped before response |
| Prompt injection via user text | Untrusted-input delimiters, input filter, tool schema whitelist, system prompt precedence |
| Health / intoxication claims | Dedicated classifier + banned-phrase list; safety prompt `sommelier.safety.v1`; human review queue for flagged turns |
| Underage access | Age gate before any recommendation; `check_age_eligibility` tool; abstain if unverified |
| Dietary errors | Hard filters; uncertainty disclosed; vegan/sulfite/kosher/halal flags from verified structured data only |
| Bias / discriminatory pricing | Price used for relevance only; no sensitive-attribute inference; regular fairness eval |
| Over-personalization filter bubble | 20% exploration bandit; diversity caps; user-controllable profile |
| Multilingual drift | Localized eval sets; tasting terms validated by native-speaker reviewers; RTL rendering tests |

**Sommelier answer contract:** every response includes `safety_note` when quantity/celebration/gifting is detected, and the canonical disclaimer *"Please enjoy responsibly."*

---

## 8. Evaluation framework

### 8.1 Offline gate (pre-deployment)

| Metric | Target | Method |
|---|---|---|
| Groundedness | ≥ 95% | Share of factual claims with valid citations, judged by sommelier-curated set |
| Factual accuracy | ≥ 92% | Gold set of 1,000 questions across 6 capabilities, 24 locales |
| Constraint adherence | ≥ 98% | Budget/category/dietary/occasion never violated |
| Pairing correctness | ≥ 90% | Panel of certified sommeliers on 300 dish×wine pairs |
| Citation precision | ≥ 97% | Cited source actually supports claim |
| Safety compliance | 100% | Zero health/intoxication/underage violations on adversarial set |
| NDCG@10 | ≥ 0.82 | Held-out purchases |
| Latency | p95 ≤ 2.0 s | Load test at 10× projected peak |

### 8.2 Online monitoring

| Signal | Alert |
|---|---|
| Thumbs-down rate | > 8% for 1 h |
| Abstain rate | > 5% for 1 h |
| Sommelier → cart rate | Drop > 15% vs 7-day baseline |
| Tool-call error rate | > 2% |
| Uncited claim rate (sampled) | > 1% |
| Safety flag rate | Any confirmed violation → page + immediate prompt rollback |

### 8.3 Evaluation set construction

- 1,000 gold questions authored with wine educators, balanced across grapes, regions, price bands and locales.
- Adversarial set: 200 prompts targeting health claims, intoxication, underage access, prompt injection and conflicting constraints.
- Pairing set: 300 dish×drink pairs with mechanism labels.
- Every prompt version is evaluated against all three sets; results stored in MLflow with the prompt version and model hash.

---

## 9. API contracts

### 9.1 REST / GraphQL

| Method | Path / operation | Purpose |
|---|---|---|
| `POST` | `/v1/sommelier/ask` | Single-turn question → answer + products + citations (existing prototype/API contract) |
| `POST` | `/v1/sommelier/sessions` | Start a multi-turn session |
| `POST` | `/v1/sommelier/sessions/:id/messages` | Continue conversation |
| `GET` | `/v1/sommelier/sessions/:id` | Current constraints and shortlist |
| `GET` | `/v1/sommelier/profile` | Taste profile + confidence |
| `PATCH` | `/v1/sommelier/profile` | Explicit profile edit |
| `DELETE` | `/v1/sommelier/profile` | Reset/delete profile |
| `POST` | `/v1/sommelier/feedback` | Record accept/reject/rating |
| `POST` | `/v1/sommelier/pair` | Dedicated food-pairing endpoint |
| `POST` | `/v1/sommelier/voice` | ASR → answer → TTS |

**Request:**

```json
POST /v1/sommelier/ask
{
  "query": "Something cozy for mushroom risotto under $40",
  "locale": "en",
  "currency": "USD",
  "country": "US",
  "session_id": "optional",
  "age_verified": true
}
```

**Response:**

```json
{
  "answer": "An earthy Pinot Noir is the match here: its forest-floor notes echo the mushrooms while its acidity lifts the cream. [S1][S2]",
  "reasoning": "Aromatic bridge plus acid against a rich dish.",
  "products": [
    { "sku_id": "sku-1006", "name": "Bourgogne Pinot Noir 2021",
      "price": "$38", "why": "Earthy, medium body, within your cap. [S3]" }
  ],
  "citations": [
    { "id": "S1", "source": "KG", "label": "Wine Knowledge Graph · pairing edges", "uri": "..." },
    { "id": "S2", "source": "tasting_note", "label": "Curated tasting corpus · Pinot Noir", "uri": "..." },
    { "id": "S3", "source": "catalogue", "label": "Vintora Market · live price", "uri": "..." }
  ],
  "clarifying_question": null,
  "profile_updates": [{ "dimension": "oak_pref", "delta": -0.05, "evidence": "user accepted low-oak Pinot" }],
  "safety_note": "Please enjoy responsibly.",
  "abstained": false
}
```

The production response extends the existing deterministic `sommelier.ts` contract without breaking it: `answer`, `citations`, `products`, `safetyNote` remain present.

### 9.2 Events

| Topic | Payload |
|---|---|
| `sommelier.asked.v1` | `session_id, user_id, intent, constraints, locale` |
| `sommelier.answered.v1` | `session_id, sku_ids, citation_count, latency_ms, abstained` |
| `sommelier.feedback.v1` | `session_id, sku_id, signal (accept/reject/rating), value` |
| `sommelier.profile.updated.v1` | `user_id, dimension, old, new, confidence` |
| `sommelier.safety.flagged.v1` | `session_id, flags, prompt_version, model_hash` |

---

## 10. Localization and voice

- **24 launch languages → 60+ by 2030**, with RTL for Arabic and Hebrew.
- Internal prompts remain English; the generation step localises the answer. Tasting terms are validated via a term glossary per locale to prevent mistranslation (e.g. "body", "dry", "off-dry", "tannin").
- Currency and tax display follow market conventions; budget parsing understands local formats (`$40`, `£30`, `40 €`, `¥6,000`).
- **Voice pipeline:** ASR → text with confidence → same Sommelier pipeline → TTS. Low ASR confidence triggers a repeat/confirm question. Voice answers are shortened to ~40 words.
- **AR label scan:** computer vision extracts producer/vintage/appellation → populates `verify_provenance` → Sommelier explains the bottle and suggests similar ones.

---

## 11. Observability and cost

| SLO | Target |
|---|---|
| Availability | 99.95% monthly |
| Answer latency p95 / p99 | 2.0 s / 4.0 s |
| Groundedness (sampled) | ≥ 95% |
| Cite-or-abstain violations | 0 |
| Tool-call success | ≥ 98% |
| Profile update propagation | ≤ 5 s |

**Cost controls:** route narrow intents to self-hosted models; cache retrieval plans for repeated constraint sets (5-min TTL); cap tool calls at 12/turn; budget alerts per tenant and per locale; shadow-eval new prompt versions before promotion.

**Tracing:** every answer carries `trace_id`, `session_id`, `prompt_version`, `model_hash`, `retrieval_source_ids` and `verifier_result` in OpenTelemetry spans.

---

## 12. Rollout plan

| Phase | Window | Deliverables | Exit criteria |
|---|---|---|---|
| **Phase 1** | Q1–Q2 2027 | Text Sommelier, 6 capabilities, citations, hard filters, 3 languages (EN/FR/ES), deterministic prototype | browser self-test (generated count), groundedness ≥ 95%, zero safety violations |
| **Phase 2** | Q3–Q4 2027 | Implicit learning, session memory, Expanded locale set, A/B harness | NDCG@10 ≥ 0.82, thumbs-down ≤ 8% |
| **Phase 3** | 2028 | Voice, WhatsApp/Messenger, contextual bandit, diversity re-rank, AR scan handoff | 12 languages, voice p95 ≤ 3 s |
| **Phase 4** | 2029 | Full transformer ranker, 24 languages, Vault provenance integration | 60% of answers multi-turn, profile opt-in ≥ 40% |
| **Phase 5** | 2030–2034 | 60+ languages, full closed loop, real-time learning at 100M users | All SLOs green at scale |

---

## 13. Prototype-to-production mapping

| Prototype element | Production destination |
|---|---|
| `sommelierReply()` in `apps/prototype/app.js` | Intent extractor + retriever + LLM generator |
| `data.js` products + `pairings` + `notes` | SKU index in OpenSearch + WKG nodes |
| Suggestion chips (`data-suggest`) | `OCCASION` and `FOOD_PAIR` intent pre-fills |
| `Sources:` strip in answers | Citation objects from verifier |
| `safety-note` in chat composer | Guardrail service + safety prompt |
| `state.chat` in `localStorage` | Redis session store + Feast signals |
| `services/api/src/sommelier.ts` | Deterministic contract preserved; production implementation behind same route |

---

## 14. Risks and open decisions

| Risk | Mitigation |
|---|---|
| WKG incompleteness for rare producers | Cite-or-abstain; curated fallback; producer attestation workflow |
| Multilingual tasting-term drift | Locale glossaries; native-speaker eval; RTL tests |
| Prompt injection via chat | Input filter, delimiters, tool whitelist, system precedence |
| Over-reliance on frontier models | Tiered routing, self-hosted fallback, cost budgets |
| Profile cold start | Quiz priors, editorial starter sets, population priors |
| Safety regression on prompt update | Shadow deployment, adversarial eval gate, instant rollback |
| Pairing disagreement among experts | Mechanism-based explanations, panel labels, confidence display |

**Open decisions for Phase 2:**

1. Fine-tune open-weight in-house vs vendor-hosted for extraction and pairing tasks.
2. Default personalization opt-in vs opt-out by market (GDPR/CCPA implications).
3. Whether voice answers carry product cards or spoken SKU references only.
4. Citation granularity: sentence-level markers vs claim chips.
5. Whether AR label scan results are displayed before or after age gate.

---

## 15. Summary

Vintora Sommelier is designed as a **master-sommelier persona backed by a measurable, grounded AI system**: a six-capability conversational surface, a three-branch hybrid retriever over a 300M-edge knowledge graph and 4.5B embedding index, an intent-weighted recommendation engine with hard budget/dietary filters, a user-controllable taste profile with a closed learning loop, and a versioned prompt library with cite-or-abstain verification. Every response is constrained by safety rules, every claim is cited, and every model or prompt change must pass an offline and online evaluation gate before promotion. The existing prototype and API provide executable contracts for the response shape, citations and safety note.
