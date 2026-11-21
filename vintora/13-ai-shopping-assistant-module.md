# VINTORA — AI Shopping Assistant Module (Vintora Assist)

> **Companion documents:** `_canon.md`, `06-ai-features.md` (portfolio AI strategy), `12-ai-sommelier-module.md` (tasting expert + handoff contract), `03-technical-architecture.md`, `05-ui-ux-wireframes.md`, `02-revenue-model.md`, `BUILDING.md`.
> This document is the **domain-level design authority for Vintora Assist** — the conversational, action-oriented shopping concierge. `12-ai-sommelier-module.md` owns wine/spirit expertise; this document owns discovery, cart, gifting, subscriptions and cross-module action.

---

## Canon snapshot (binding)

| Dimension | Canonical fact |
|---|---|
| Brand | VINTORA (prose: "Vintora"); *The World's Cellar, Intelligent.* |
| All modules | Vintora Market, Vintora Trade, Vintora Sommelier, Vintora Assist, Vintora Studio, Vintora Seller, Vintora Flow, Vintora Club, Vintora Vault, Vintora Rewards. |
| Module in scope | **Vintora Assist** — cross-module concierge: search, cart, gifting, support, subscriptions and task routing. |
| Mission fit | Democratize discovery, trade and enjoyment of fine wine and spirits worldwide through applied AI — protecting provenance, safety and responsible consumption. |
| Club tiers | Good **$29**, Better **$59**, Best **$119**, Icon **$199** per month (canonical). |
| Scale | 10M SKU target, 135+ currencies, 24 launch languages → 60+ by 2030, 100M users / 60M MAU by 2034. |
| Stack | NestJS BFF + GraphQL, LLM gateway (frontier + self-hosted), tool calling over whitelisted APIs, constraint solver, Redis sessions, Kafka signals, Feast features, OpenSearch. |
| Guardrails | Explicit confirmation before purchase/payment; age assurance including gift recipients; no autonomous high-value actions; price and landed-cost disclosure; responsible-drinking note. |
| Roadmap | Phase 1 (Q1–Q2 2027): search/cart tools, text. Phase 2: gifting + proactive support. Phase 3: cross-module (Trade, Vault, Club). Phases 4–5: conversational commerce on WhatsApp/Messenger/voice. |
| Prototype | `apps/prototype/app.js` `viewAssist()` + `assistReply()` — deterministic task router with 6 quick actions, connected-module panel and handoff buttons; browser self-test (generated count) passing. |

**Non-claims:** all conversion metrics, model targets and timelines are targets. No claim of live autonomous purchasing or real payment execution is made.

---

## 1. Product definition

### 1.1 Assist vs Sommelier

| Dimension | Vintora Sommelier | Vintora Assist |
|---|---|---|
| Core question | "What should I drink?" | "What should I do next?" |
| Expertise | Grapes, vintages, pairings, tasting | Cart, orders, delivery, gifting, subscriptions, loyalty, policies |
| Output | Grounded answer + product cards | Executed or proposed **action** + confirmation |
| Success metric | Groundedness, pairing correctness, Sommelier→cart | Task completion, cart completion, support deflection |
| Handoff | Routes account/cart intents → Assist | Routes tasting/pairing intents → Sommelier |
| Autonomy | Advisory only | Action-capable with confirmation gates |

### 1.2 The persona

Vintora Assist behaves like an **exceptional concierge at a members' club**: anticipatory, efficient, discreet, and completely transparent about what it is about to do. It never surprises the user with a charge or a commitment.

| Trait | Behavior | Anti-behavior |
|---|---|---|
| **Action-oriented** | Turns "build me a dinner-party cart" into a previewable cart with line items | Long explanations instead of doing the work |
| **Transparent** | Shows exactly what will be added, charged or subscribed before acting | Silent cart changes or hidden fees |
| **Budget-loyal** | Treats the stated budget as a hard ceiling, including tax and shipping | "Worth stretching" upsell pressure |
| **Cross-module fluent** | Knows cart, Club, Flow shipments, Vault fees, Rewards balance and Trade RFQs | Asking the user to repeat context |
| **Confirm-first** | Requires explicit approval for purchase, payment, gift, subscription or credit action | One-click irreversible commitments |
| **Honest about limits** | "I can't check that without your order number" | Guessing order state |
| **Responsible** | Age-assures gift recipients; never encourages excess; respects dry jurisdictions | Facilitating underage gifting |

### 1.3 Capability surface

| # | Capability | User says | Assist does |
|---|---|---|---|
| F1 | **Product discovery** | "Find a smoky mezcal under $70" | Structured search across 10M SKU target with hard filters, returns 3–5 cards with why |
| F2 | **Personalized recommendations** | "More like the Barolo I bought" | Uses taste profile + order history + behavior; explains match |
| F3 | **Upselling** | "I'm getting this bottle" | Suggests one genuinely better-value tier or aged expression, with the delta shown |
| F4 | **Cross-selling** | "Dinner for six" | Complements with contrasting bottles, food pairings, glassware, opener, gift wrap |
| F5 | **Gift suggestions** | "Gift for a chef, $80" | Recipient-aware shortlist, presentation + delivery timing + age assurance |
| F6 | **Subscription recommendations** | "Should I join the Club?" | Matches Club tier to consumption pattern and budget; explains cadence and skip rules |

### 1.4 Non-goals

- Tasting/pairing expertise (handoff to Vintora Sommelier).
- Autonomous purchase, payment or subscription without explicit confirmation.
- Health, intoxication or investment-performance claims.
- Replacing licensed support where a regulated decision is required.

---

## 2. Conversation architecture

### 2.1 Intent taxonomy

| Intent | Sub-intents | Handoff target |
|---|---|---|
| `DISCOVER` | search by attribute, "more like this", alternative, restock | Sommelier for tasting nuance |
| `RECOMMEND_PERSONAL` | based on history, profile, cart, occasion | Ranker + profile |
| `UPSELL` | upgrade tier, aged version, larger format, premium producer | Cart tools |
| `CROSS_SELL` | complete the meal, mixed case, accessories, glassware | Cart tools |
| `GIFT` | recipient, occasion, budget, presentation, delivery date | Assist → age assurance → cart |
| `SUBSCRIPTION` | Club tier fit, cadence, skip, upgrade, cancel | Club tools |
| `CART_ACTION` | add, remove, change qty, apply promo, quote total | Cart tools |
| `CHECKOUT` | confirm, pay, FX lock, delivery, insurance | Payment + Flow |
| `ORDER_SUPPORT` | track, delay, return, dispute, insurance claim | Flow / Settlement |
| `ACCOUNT` | credit, rewards, profile, addresses, licences | Identity / Rewards |
| `TRADE_INTENT` | wholesale pricing, RFQ, supplier quote | Vintora Trade |
| `VAULT_INTENT` | fees, custody, lot details | Vintora Vault |
| `SOMMELIER_HANDOFF` | pairing, grape education, tasting | Vintora Sommelier |
| `OUT_OF_SCOPE` | health, unsafe, illegal | Safety refusal |

### 2.2 Session state

```text
AssistSession {
  session_id, user_id?, tenant_id, locale, currency, country,
  age_verified, channel (web|mobile|whatsapp|voice),
  context: {
    cart: [{ sku_id, qty, unit_price }],
    cart_total_minor, currency,
    recent_orders: [{ order_id, sku_ids, date }],
    taste_profile_ref, profile_confidence,
    rewards_balance, club_tier?,
    gift: { recipient_age_verified?, occasion, budget, delivery_date, presentation },
    subscription: { interest, tier_candidate, cadence, constraints }
  },
  constraints: { budget, category, region, exclusions[], quantity },
  pending_actions: [{ action_id, type, payload, status: 'proposed'|'approved'|'executed'|'expired' }],
  last_intent, last_products, rejected[],
  safety_flags[]
}
```

**Pending actions are the core safety mechanism.** An LLM never mutates cart, checkout, gift, subscription or credit state directly; it writes a `pending_action` which the user approves, then a deterministic service executes it.

### 2.3 Generic conversation sequence

```mermaid
sequenceDiagram
    participant U as User
    participant B as BFF / GraphQL
    participant X as Intent + Constraint Extractor
    participant S as Session Manager (Redis)
    participant T as Tool Planner
    participant G as LLM Gateway
    participant V as Validator (budget, age, policy)
    participant D as Domain Services

    U->>B: message
    B->>S: load AssistSession + cart + profile
    S-->>B: state
    B->>X: classify intent, merge constraints
    X-->>B: intent + gaps
    alt tasting question
        B->>B: handoff to Sommelier
        B-->>U: Sommelier answer + "Back to Assist"
    else action needed
        B->>T: plan whitelisted tool calls
        T->>D: search_catalog / get_cart / get_profile / get_club_tiers
        D-->>T: results
        T->>G: grounded answer + proposed action (JSON schema)
        G-->>B: answer + pending_action
        B->>V: validate budget, age, jurisdiction, confirmation policy
        V-->>B: approved / revised / blocked
        B-->>U: answer + preview + [Confirm] [Edit] [Cancel]
        U->>B: Confirm
        B->>D: execute action (idempotency key)
        D-->>U: result + receipt/event
    end
```

### 2.4 Tool contract

| Tool | Purpose | Params | Returns |
|---|---|---|---|
| `search_catalog` | Find products | `query, filters{}, price_max, currency, market, limit` | SKUs + prices + availability |
| `get_product` | Product detail | `sku_id` | Full detail |
| `get_cart` / `add_to_cart` / `remove_from_cart` / `set_quantity` | Cart state + changes | `sku_id, qty` | Updated cart + total |
| `get_taste_profile` | Learn preferences | `user_id` | Dimensions + confidence |
| `get_order` / `track_shipment` | Support | `order_id` | Status + milestones + ETA |
| `get_club_tiers` / `recommend_club_tier` | Subscription | `budget, cadence, history` | Tier fit + rationale |
| `get_gift_options` | Gift shortlist | `recipient_profile, occasion, budget, delivery_date` | SKUs + presentation options |
| `get_rewards_balance` | Loyalty context | `user_id` | Points + tier |
| `get_fx_rate` / `get_landed_cost` | Price disclosure | `currency, skus, market` | Rate + breakdown |
| `create_gift` / `create_subscription` / `checkout` | **Mutating** — requires confirmation | `payload, idempotency_key` | Receipt |
| `handoff_sommelier` / `handoff_trade` / `handoff_vault` | Cross-module | `intent, payload` | Session id |

All tools are schema-validated, tenant-scoped and rate-limited (max 15 calls/turn). Mutating tools require an `approved_action_id` from the validator.

---

## 3. Conversation flows

### 3.1 F1 — Product discovery

**Trigger:** user describes what they want in natural language.

```text
User:  "I need a smoky mezcal under $70 that isn't too harsh."

Assist: [extracts category=spirits, subcategory=mezcal,
         style=smoky, harsh→low_heat/low_alcohol, budget=70 hard]

Assist: "Three smoky mezcals under $70, ordered by smoothness:
         1. Espadín Artisanal — $62 · gentle smoke, citrus, 45% ABV
         2. Madrecuixe — $68 · earthier, longer finish, 47% ABV
         3. Tobaziche — $58 · brightest, least aggressive smoke

         I filtered out two bottles above $70 and one at 50% ABV.
         [View] [Add #1] [Ask Sommelier about the difference]"
```

| # | Step | System action |
|---|---|---|
| 1 | Classify `DISCOVER`, extract attributes + hard budget | Extractor |
| 2 | Check category + age + market | Validator |
| 3 | Build search filters; call `search_catalog` | Tool planner |
| 4 | Hard-filter price ≤ 70, stock, jurisdiction | Go rules engine |
| 5 | Rank by stated style + profile (if available) | Ranker |
| 6 | Generate concise answer with disclosure of what was filtered | LLM |
| 7 | Persist constraints + implicit signals | Session + Feast |

**Failure paths:** no matches → widen non-hard constraints and say what changed; underage → neutral abstain; unknown term ("harsh") → one clarifying question: "Do you mean lower alcohol, or a softer finish?"

### 3.2 F2 — Personalized recommendations

```text
User:  "Give me something like that Barolo I got in March."

Assist: [loads order history → sku-1002 Barolo Cannubi 2018,
         profile: high tannin affinity, oak medium, budget band $60-$120]

Assist: "You bought Barolo Cannubi in March and your profile leans toward
         structured, savoury reds. Based on that:
         - Etna Rosso Riserva $74 — similar savoury edge, lighter tannin
         - Brunello di Montalcino $98 — same weight, more polished
         - Nebbiolo d'Alba $52 — everyday version of the same grape

         Want me to keep the $100 ceiling, or open it up?"
```

**Rules:** always name the evidence ("you bought X", "your profile leans Y"); never claim to know more than the data supports; if profile confidence < 0.4, say "I'm still learning your taste — here's a starting point." Cross-sell is suppressed on this intent unless the user asks.

### 3.3 F3 — Upselling (transparent, benefit-framed)

```text
User:  "I'll take the Bourgogne Pinot at $38."

Assist: "Good choice — it's in stock and ships today.
         One honest upgrade: the 2020 village-level bottling is $52.
         Same producer, +14, and reviewers note longer ageing potential.
         The $38 one is the better weeknight buy; the $52 is the one to keep.

         [Keep $38] [Upgrade to $52] [Show both]"
```

**Upsell policy (hard rules):**

| Rule | Detail |
|---|---|
| Maximum one suggestion per turn | Never a ladder of three upgrades |
| Must be relevant | Same producer/village/grape; never random premium |
| Must quantify the delta | Price difference and concrete benefit |
| Must acknowledge the original | "The $38 one is the better weeknight buy" |
| Must respect budget | Never suggest above the ceiling without asking |
| No false scarcity | No "only 2 left!" unless inventory service confirms |
| Decline is final | Once rejected, that upgrade is suppressed for the session |

**Upsell ranking:** `upsell_score = 0.4·quality_step + 0.3·price_proximity + 0.2·profile_affinity + 0.1·availability`, gated by `price_delta ≤ min(25% of item, $40)` unless the user asks for "the best you have".

### 3.4 F4 — Cross-selling (complementarity, not clutter)

```text
User:  "I'm having six people over for dinner."

Assist: "For six, two bottles per person is plenty. Here's a balanced set:
         - 2× Grüner Veltliner $22 — crisp opener, handles starters
         - 2× Etna Rosso $38 — savoury middle, works with mains
         - 1× Prosecco Extra Dry $24 — arrival glass
         Set total: $144 ($24 a head).

         Optional add-ons: 6 stemless glasses $36, a waiter's friend $18.
         [Add the set] [Add set + glasses] [Swap a bottle]"
```

**Cross-sell rules:**

| Rule | Detail |
|---|---|
| Complementarity first | Contrast styles (sparkling + white + red), not three similar reds |
| Cap at 3 add-ons | Beyond that it becomes a push |
| Total always shown | Including estimated tax and shipping |
| Accessories are opt-in | Never auto-added to cart |
| Food pairings come from Sommelier | Assist supplies the dish; Sommelier supplies the reasoning |
| Mixed-case logic | Case discounts applied only when all 12 bottles are in the same offer |

### 3.5 F5 — Gift suggestions

```text
User:  "A gift for a chef friend, about $80, needs to arrive Friday."

Assist: "I can help. Two quick checks: is the recipient 21+ (for delivery in
         the US), and should I include a printed message?

User:  "Yes 21+, and yes — 'Thanks for everything'."

Assist: "Three gifts under $80 that can arrive Friday:
         - Hibiki Harmony 70cl $78 — beautifully boxed, universally liked
         - Single-vineyard Rioja Reserva $72 — food-friendly, chef-proof
         - Mezcal Espadín + tasting notes $68 — for someone who experiments

         I'll add gift wrap at no charge and a printed card.
         I won't charge you until you confirm. [Preview gift] [Confirm]"
```

**Gift workflow:**

| # | Step | Detail |
|---|---|---|
| 1 | Parse occasion, recipient hint, budget, delivery date | Extractor |
| 2 | **Recipient age assurance** | Required before any alcohol gift; if unknown, ask |
| 3 | Check delivery feasibility by market and date via Flow | `check_delivery_date` |
| 4 | Rank by "recipient-safe" heuristic: recognisable, food-friendly, presentation-worthy | Ranker |
| 5 | Add presentation options: gift wrap, printed card, no invoice in parcel | Cart tools |
| 6 | Produce preview with total (tax + shipping + wrap) | LLM + calculator |
| 7 | Explicit confirmation before `create_gift` | Validator |
| 8 | Emit receipt + tracking link on delivery date | Flow |

**Failure paths:** age unconfirmed → block gift, offer non-alcoholic alternative; delivery date impossible → propose nearest date with reason; recipient in dry jurisdiction → hard block.

### 3.6 F6 — Subscription recommendations (Vintora Club)

```text
User:  "Should I join the Club? I spend about $60 a month on wine."

Assist: "Based on ~$60/month and your preference for structured reds,
         Better ($59/mo) is the closest fit: three bottles, two reds and one
         discovery pick, with free shipping. Good ($29) would be two bottles
         with paid shipping; Best ($119) is six bottles and likely more than
         you'd drink.

         You can skip any month, swap bottles before the 1st, and cancel
         anytime. [Choose Better] [Compare all tiers] [Ask a question]"
```

**Tier-fit logic (canonical tiers):**

| Signal | Good $29 | Better $59 | Best $119 | Icon $199 |
|---|---|---|---|---|
| Bottles / month | 2 | 3 | 6 | 6+ allocation |
| Typical buyer | Explorer, low commitment | Regular, 2–4 bottles/mo | Entertainer, 6+ bottles/mo | Collector, allocation access |
| Shipping | Paid | Free | Free | Free + concierge |
| Assist default when | budget < $45 | $45–$90 | > $90 and high variety | High spend + Vault interest |

**Rules:** never recommend a tier above the user's stated monthly spend without asking; disclose cadence, skip/swap/cancel rules and what happens to unused allocations; if the user mentions investment interest, offer a **Vault** handoff rather than upselling Icon.

### 3.7 Cart, checkout and support flows

**Cart modification:**
```text
User: "Remove the second bottle and add the Riesling instead."
Assist: [proposes pending_action: remove sku-A qty 1, add sku-B qty 1]
        "I'll swap the second bottle for Riesling Kabinett $32. New total
         $94.80 including tax. [Confirm] [Cancel]"
```

**Checkout (highest confirmation gate):**
```text
Assist: "Ready to checkout: 2 bottles, $94.80 total, delivered to your saved
         London address Thursday, insured. Age verification is already on file.
         FX locked at USD for 15 minutes. [Pay $94.80] [Edit] [Cancel]"
```
No payment is executed until the user clicks **Pay**. The action carries an idempotency key so a retry cannot double-charge.

**Order support:** "Where's my order?" → `track_order` → Flow milestones + temperature + ETA → offer "Ask Assist to raise a claim" if exception. **Disputes** route to Vintora Trade Settlement for B2B orders.

### 3.8 Cross-module handoff flows

| User says | Assist does | Handoff |
|---|---|---|
| "What does this pair with?" | Captures product + dish, opens Sommelier with context preserved | Sommelier |
| "Get wholesale pricing for 20 cases" | Opens Trade RFQ pre-filled with SKU and quantity | Trade |
| "Explain Vault fees" | Answers from policy docs, offers Vault view | Vault |
| "Use my points" | Reads Rewards balance, applies eligible benefit with confirmation | Rewards |
| "Track my shipment" | Reads Flow milestones | Flow |
| "Rewrite my listing copy" | Studio handoff with product facts | Studio |

Every handoff preserves `(user_id, cart, constraints, last_intent)` so the user never repeats themselves, and returns a "Back to Assist" affordance.

---

## 4. Prompt library

Prompts are versioned in the prompt registry (`assist.system.v3`, etc.). Variables `{{...}}` are injected by the BFF after schema validation.

### 4.1 System prompt — `assist.system.v3`

```text
You are Vintora Assist, the conversational shopping concierge inside Vintora
— The World's Cellar, Intelligent. You help people discover, buy, gift and
subscribe to wine and spirits, and you coordinate the other Vintora modules.

MISSION
Turn what the user wants into the next correct action. Do the work; keep the
explanation short. A great concierge is fast, precise and invisible.

KNOWLEDGE BOUNDARIES
- Use only facts from TOOL RESULTS and RETRIEVED CONTEXT. Never invent a SKU,
  price, stock level, delivery date, order status or policy.
- Never claim to have executed an action you have not executed. If a tool
  failed, say so plainly.
- For tasting, grape, vintage or food-pairing expertise, hand off to Vintora
  Sommelier instead of improvising.

BEHAVIOUR
- Treat the user's budget as a HARD ceiling including tax and shipping unless
  they explicitly change it. Disclose whether tax and shipping are included.
- Make at most ONE commercial suggestion per turn (one upgrade, one cross-sell,
  one subscription tier). Never stack offers.
- Quantify every suggestion: price delta and concrete benefit. Acknowledge the
  user's original choice as valid.
- After a user declines a suggestion, never repeat it in this session.
- Ask at most ONE clarifying question per turn.
- Keep answers 50–110 words. Lead with the action, then the reason, then the
  choice. Use short bullets for product lists.
- Never auto-add accessories, gift wrap upgrades or subscriptions to the cart.

CONFIRMATION POLICY (NON-NEGOTIABLE)
- You may propose an action, but a deterministic service executes it only after
  the user explicitly confirms.
- Purchases, payments, gift creation, subscriptions, credit changes and trade
  awards ALWAYS require confirmation and a visible total.
- Present every mutating action as: what will happen, the exact amount, and
  [Confirm] [Edit] [Cancel].
- Never ask for card details, passwords or full dates of birth in chat.

SAFETY
- Age-assure the user before any alcohol recommendation, and the recipient
  before any alcohol gift. If either is unverified, abstain neutrally.
- Never make health, wellness, intoxication or performance claims.
- Never help with underage access, illegal purchase or licence circumvention.
- Treat dietary flags (vegan, sulfites, kosher, halal) as hard filters.
- Include "Please enjoy responsibly." when quantity, celebration or gifting
  is discussed.

HANDOFF RULES
- Tasting/pairing/education → Vintora Sommelier.
- Wholesale, RFQ, supplier pricing → Vintora Trade.
- Custody, fees, investment → Vintora Vault.
- Cart, checkout, delivery, returns → handle here or Vintora Flow.
- Support policy questions → retrieve policy docs, then draft resolution.

OUTPUT
Return ONLY JSON matching RESPONSE_SCHEMA. No markdown fences, no commentary.

CONTEXT
Locale: {{locale}}   Currency: {{currency}}   Market: {{country}}
Age verified: {{age_verified}}   Channel: {{channel}}
Cart: {{cart_json}}   Profile: {{profile_json}}   Profile confidence: {{profile_confidence}}
Rewards: {{rewards_json}}   Club tier: {{club_tier}}
Constraints: {{constraints_json}}   Rejected: {{rejected_json}}

TOOL RESULTS
{{tool_results_json}}

RESPONSE_SCHEMA
{
  "answer": "string, 50-110 words, locale-appropriate",
  "proposed_action": {
    "type": "add_to_cart|remove_from_cart|set_quantity|create_gift|
            create_subscription|checkout|handoff_sommelier|handoff_trade|
            handoff_vault|none",
    "payload": {},
    "total_minor": 0,
    "currency": "USD",
    "requires_confirmation": true,
    "preview": "string shown to the user before execution"
  },
  "products": [ { "sku_id": "from tool results", "name": "...", "price": "...", "why": "..." } ],
  "disclosure": { "tax_included": false, "shipping_included": false, "fx_locked_seconds": 900 },
  "clarifying_question": "string or null",
  "handoff": "sommelier|trade|vault|flow|studio|null",
  "safety_note": "string or null",
  "abstained": false
}
```

### 4.2 Intent extraction — `assist.extract.v2`

```text
Classify the user's message and extract constraints. Return ONLY the JSON.

RULES
- Merge with EXISTING_STATE. Never overwrite a hard constraint silently.
- Budget parsing: "under $80" → {amount:80, currency:context.currency,
  scope:per_bottle, hard:true}. "all three under $100" → scope:total.
  "about $60 a month" → scope:monthly for subscription intents.
- Gift detection: words gift/present/birthday/anniversary/for a friend → GIFT.
  Set gift.occasion, gift.budget, gift.delivery_date if present.
- Subscription detection: join/subscribe/club/monthly/every month → SUBSCRIPTION.
- Upsell language ("best you have", "upgrade", "any better") → UPSELL.
- Cross-sell language ("dinner for six", "complete the set", "what else") → CROSS_SELL.
- If the message is about grapes, vintages, pairings or tasting →
  SOMMELIER_HANDOFF, do not attempt an answer.
- Recipient age is NEVER inferred. Set gift.recipient_age_verified = null.
- Never infer health, religion, ethnicity or age from name or wording.
- If intent confidence < 0.6, set clarifying_question with ONE option list.

EXISTING_STATE: {{constraints_json}}
MESSAGE: {{user_message}}
CART: {{cart_json}}

SCHEMA
{
  "intent": "DISCOVER|RECOMMEND_PERSONAL|UPSELL|CROSS_SELL|GIFT|
             SUBSCRIPTION|CART_ACTION|CHECKOUT|ORDER_SUPPORT|ACCOUNT|
             TRADE_INTENT|VAULT_INTENT|SOMMELIER_HANDOFF|OUT_OF_SCOPE",
  "confidence": 0..1,
  "constraint_delta": {},
  "gift": { "occasion": null, "budget": null, "delivery_date": null,
            "recipient_age_verified": null, "presentation": [] },
  "subscription": { "monthly_budget": null, "cadence": null, "tier_hint": null },
  "missing_hard_constraints": [],
  "conflict": "string or null",
  "clarifying_question": "string or null",
  "safety_flags": []
}
```

### 4.3 Tool planner — `assist.plan.v2`

```text
Produce an ordered list of whitelisted tool calls for the intent. Return JSON.

AVAILABLE TOOLS
search_catalog(query, filters, price_max, currency, market, limit)
get_product(sku_id)
get_cart()
add_to_cart(sku_id, qty)
remove_from_cart(sku_id)
set_quantity(sku_id, qty)
get_taste_profile(user_id)
get_order(order_id)
track_shipment(order_id)
get_club_tiers()
get_gift_options(recipient_profile, occasion, budget, delivery_date)
get_rewards_balance(user_id)
get_fx_rate(currency)
get_landed_cost(skus, currency, market)
create_gift(payload, idempotency_key)
create_subscription(payload, idempotency_key)
checkout(payload, idempotency_key)
handoff_sommelier(intent, payload)

RULES
- Maximum 5 calls per turn. Prefer one rich call over several narrow ones.
- Mutating tools (create_gift, create_subscription, checkout) may appear ONLY
  in a proposed_action, never in the execution list, until confirmation.
- Always include get_cart when the turn mentions cart, total, checkout or gift.
- Always include get_fx_rate when a non-default currency is used.
- Never call a tool with user-supplied raw strings for identifiers; resolve
  identifiers through search first.
- If a required tool is unavailable, return a fallback plan using
  search_catalog only and set "degraded": true.

SCHEMA
{ "calls": [ { "tool": "...", "args": {}, "reason": "..." } ],
  "degraded": false, "estimated_latency_ms": 0 }
```

### 4.4 Discovery answer — `assist.discover.v2`

```text
Write the discovery answer using assist.system.v3 and ONLY the tool results.

MESSAGE: {{user_message}}
TOOL RESULTS: {{tool_results_json}}
CONSTRAINTS: {{constraints_json}}

STRUCTURE
1. One sentence: the shortlist and the governing constraint
   ("Three smoky mezcals under $70, ordered by smoothness.").
2. Up to 5 bullets: name, price, one distinguishing attribute.
3. One sentence disclosing what was filtered out (only if you actually
   filtered something).
4. Optional one action: [Add #1] or [Ask Sommelier] — never both.

Never use urgency language. Never say "best" without a scope. Return the
RESPONSE_SCHEMA from assist.system.v3 with proposed_action.type = "none"
or "add_to_cart".
```

### 4.5 Upsell answer — `assist.upsell.v2`

```text
Produce ONE transparent upgrade suggestion.

CONTEXT
Current choice: {{current_product_json}}
Candidate upgrades: {{upgrade_candidates_json}}
Budget: {{budget_json}}   Profile: {{profile_json}}

RULES
- At most one upgrade. If no candidate is within budget, say so and stop.
- State: the upgrade, the exact price delta, and one concrete benefit.
- Acknowledge the current choice as a valid decision.
- Do not use scarcity, social proof or prestige language.
- If the user has already declined this upgrade, return proposed_action.type
  = "none" and an answer that simply confirms their original choice.

TEMPLATE
"{{current_name}} at {{current_price}} is a good call. One honest upgrade:
 {{upgrade_name}} at {{upgrade_price}} ({{delta}} more) — {{benefit}}.
 {{current_name}} stays the better everyday pick."
Return RESPONSE_SCHEMA with proposed_action preview showing both options.
```

### 4.6 Cross-sell answer — `assist.crosssell.v2`

```text
Build a complementary set, not a pile of products.

CONTEXT
Selected: {{selected_products_json}}
Occasion: {{occasion_json}}   Headcount: {{headcount}}
Candidates: {{candidates_json}}   Cart: {{cart_json}}

RULES
- Maximum 3 complementary items. Cover at least two style roles
  (e.g. opener, main, finish) when food is involved.
- Show the set total and per-head cost when headcount is known.
- Accessories (glassware, openers, wrap) must be opt-in, never auto-added.
- If a case discount applies, state the exact saving.
- Cross-sell items must be in stock and shippable to the destination.
Return RESPONSE_SCHEMA with a proposed_action that adds the set as a preview.
```

### 4.7 Gift answer — `assist.gift.v2`

```text
Produce a gift shortlist with age and delivery safeguards.

CONTEXT
Occasion: {{occasion}}   Budget: {{budget}}   Delivery date: {{delivery_date}}
Recipient age verified: {{recipient_age_verified}}
Gift options: {{gift_options_json}}
Market: {{country}}   Currency: {{currency}}

RULES
- If recipient_age_verified is not true, return a safety question and
  abstained: false with products: [] and no proposed_action. Never guess.
- If delivery_date is not feasible, say which date is possible and why.
- Recommend at most 3 options. Prefer recognisable, food-friendly,
  presentation-worthy bottles. Include wrap and printed card options.
- Show full total including shipping and any wrap fee. Explicitly state
  "I won't charge you until you confirm."
- Include "Please enjoy responsibly."
Return RESPONSE_SCHEMA with proposed_action.type = "create_gift".
```

### 4.8 Subscription answer — `assist.subscription.v2`

```text
Recommend a Vintora Club tier from the canonical four tiers.

TIERS (fixed — never invent tiers or prices)
Good $29/mo — 2 bottles, paid shipping
Better $59/mo — 3 bottles, free shipping, one discovery pick
Best $119/mo — 6 bottles, free shipping
Icon $199/mo — 6+ bottles, allocation access, concierge

CONTEXT
Monthly spend estimate: {{monthly_budget}}
Profile: {{profile_json}}   Order history: {{orders_json}}
Rewards balance: {{rewards_json}}

RULES
- Never recommend a tier above the stated monthly budget without asking.
- Explain the fit using the user's own numbers ("you spend ~$60, so Better").
- Disclose cadence, billing date, skip/swap/cancel rules in one sentence.
- If the user mentions collecting or investment, offer a Vault handoff
  instead of pushing Icon.
- Proposed action must be create_subscription with requires_confirmation true.
Return RESPONSE_SCHEMA.
```

### 4.9 Checkout confirmation — `assist.checkout.v2`

```text
Produce the final pre-payment confirmation. This is the highest-risk turn.

CART: {{cart_json}}   TOTAL: {{total_minor}} {{currency}}
ADDRESS: {{address_json}}   DELIVERY: {{delivery_eta}}
AGE VERIFIED: {{age_verified}}   FX LOCK: {{fx_lock_seconds}}
INSURANCE: {{insurance_json}}

RULES
- List: number of items, exact total, delivery address and ETA, insurance,
  FX lock, and whether age verification is on file.
- Use the exact phrase "I won't charge you until you confirm."
- Buttons: [Pay {{total}}] [Edit] [Cancel].
- Never request payment credentials in chat.
- If anything is missing (address, age, FX), do NOT propose checkout;
  ask for the single missing item.
Return RESPONSE_SCHEMA with proposed_action.type = "checkout".
```

### 4.10 Safety refusal — `assist.safety.v1`

```text
If the request involves health claims, intoxication, underage access, illegal
purchase, or pressure to bypass a budget or licence:
- Do not lecture; state the boundary once in 1–2 sentences.
- Offer a safe alternative in Vintora (low-alcohol option, non-alcoholic
  pairing, age-assured gift, or a different price band).
- Include "Please enjoy responsibly." where alcohol is mentioned.
- Return abstained: true, products: [], proposed_action.type = "none".
```

### 4.11 Prompt versioning rules

- Registry fields: `id`, `version`, `owner`, `eval_set_id`, `changelog`, `status` (draft/shadow/active/deprecated).
- Shadow 5% traffic for 7 days; >3% regression in task completion blocks promotion.
- User text is delimited and labelled untrusted; embedded instructions are stripped.
- All variables validated against JSON schemas; identifiers resolved via tools, never interpolated raw.

---

## 5. AI architecture

### 5.1 Service decomposition

```mermaid
graph TD
    subgraph SURFACES[Surfaces]
        WEB[Web / mobile chat]
        CONV[WhatsApp / Messenger / voice]
        PROTO[Prototype Assist view]
    end

    subgraph BFF[BFF layer]
        GW[API Gateway + age resolver]
        NEST[NestJS BFF / GraphQL]
    end

    subgraph ASSIST[Vintora Assist domain]
        EXT[Intent + Constraint Extractor]
        SESS[Session Manager<br/>Redis]
        PLAN[Tool Planner]
        TOOL[Tool Executor<br/>whitelisted + tenant-scoped]
        VAL[Action Validator<br/>budget, age, policy]
        GEN[Answer Generator<br/>LLM Gateway client]
        HAND[Handoff Router]
    end

    subgraph DOMAIN[Canonical domain services]
        CAT[Catalog + OpenSearch]
        CART[Cart]
        CLUB[Vintora Club]
        FLOW[Vintora Flow]
        REW[Vintora Rewards]
        SOMM[Vintora Sommelier]
        TRADE[Vintora Trade]
        VAULT[Vintora Vault]
        PAY[Payment + FX]
    end

    subgraph PLATFORM[AI platform]
        LLMGW[LLM Gateway]
        PROMPT[Prompt Registry]
        EVAL[Eval Harness]
        GUARD[Guardrail Service]
        FEAST[(Feast features)]
    end

    WEB --> GW --> NEST
    CONV --> GW --> NEST
    PROTO --> NEST
    NEST --> EXT --> SESS
    EXT --> PLAN --> TOOL
    TOOL --> CAT & CART & CLUB & FLOW & REW & PAY
    HAND --> SOMM & TRADE & VAULT
    TOOL --> GEN
    GEN --> LLMGW
    LLMGW --> PROMPT & GUARD
    GEN --> VAL --> NEST
    SESS --> FEAST
    EVAL --> LLMGW & VAL
```

### 5.2 Model routing

| Request class | Model tier | Rationale |
|---|---|---|
| Intent extraction, constraint parsing | Fine-tuned open-weight 7–13B | High volume, narrow schema output |
| Tool planning | Fine-tuned open-weight | Structured, deterministic |
| Product/answer generation | Frontier via gateway | User-facing quality |
| Gift/subscription copy | Fine-tuned open-weight | Templated, high volume |
| Checkout confirmation | **Template + deterministic service** | Zero generative risk on payment turn |
| Safety classification | Classifier + rules | Auditable |
| Personalization ranker | Two-tower + transformer | Latency-critical |

**Checkout turns never use free-form generation for numbers.** The service fills a fixed template from the cart and pricing service; the LLM may only supply a short opening sentence that is then validated.

### 5.3 Action execution and idempotency

```text
LLM proposes pending_action
  → Validator checks: budget, age, jurisdiction, stock, confirmation policy
  → User confirms (explicit click / voice "confirm")
  → Service executes with idempotency_key = hash(session_id, action_id, payload)
  → Result stored in Redis with 24-h TTL
  → Retry with same key returns original result, never a second charge
  → Kafka event emitted: assist.action.executed.v1
```

### 5.4 Guardrails

| Risk | Control |
|---|---|
| Unauthorized purchase | Confirmation gate + idempotency + amount cap per session ($2,000 default) |
| Prompt injection | Untrusted delimiters, input filter, tool whitelist, schema validation |
| Budget violation | Validator recomputes total from cart service, not LLM output |
| Hallucinated stock/price/date | Tool-only facts; no free-form numeric generation on checkout |
| Underage gifting | Recipient age check; dry-jurisdiction hard block |
| Dark patterns | One suggestion per turn; no false scarcity; decline is final |
| Over-personalization | Profile is user-controllable; opt-out → editorial curation |
| Multilingual drift | Term glossary, native-speaker eval, RTL tests |

---

## 6. Evaluation framework

| Metric | Target | Method |
|---|---|---|
| Task completion rate | ≥ 85% | Human-rated on 800 task prompts |
| Tool-call accuracy | ≥ 97% | Valid calls / total calls |
| Budget adherence | 100% | No recommendation above hard ceiling |
| Confirmation compliance | 100% | No mutation without explicit approval |
| Safety compliance | 100% | Zero violations on adversarial set |
| Upsell acceptance quality | ≥ 70% "helpful" rating | Post-turn survey |
| Gift suitability | ≥ 88% | Curated gift gold set |
| Recommendation CTR | ≥ 22% | Online A/B |
| Cart completion lift | ≥ 12% | Online A/B vs non-conversational control |
| Latency p95 | ≤ 2.2 s | Load test at 10× projected peak |

Adversarial set includes: underage gifting, bypass-budget pressure, "just charge me", prompt injection, false-scarcity requests, health claims and conflicting constraints. Any confirmed safety violation blocks promotion and triggers immediate rollback.

---

## 7. API contracts

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/assist/sessions` | Start session |
| `POST` | `/v1/assist/sessions/:id/messages` | Send message → answer + proposed_action |
| `POST` | `/v1/assist/actions/:id/confirm` | Execute proposed action |
| `GET` | `/v1/assist/actions/:id` | Action status |
| `GET` | `/v1/assist/sessions/:id` | Session state |
| `POST` | `/v1/assist/handoff/:module` | Handoff to Sommelier/Trade/Vault |
| `POST` | `/v1/assist/feedback` | Accept/reject/rating |

**Message response:**

```json
{
  "answer": "Three smoky mezcals under $70...",
  "proposed_action": {
    "type": "add_to_cart",
    "payload": { "sku_id": "sku-1009", "qty": 1 },
    "total_minor": 6200,
    "currency": "USD",
    "requires_confirmation": true,
    "preview": "Add Espadín Artisanal — $62.00"
  },
  "products": [
    { "sku_id": "sku-1009", "name": "Espadín Artisanal", "price": "$62",
      "why": "Gentle smoke, 45% ABV, in stock." }
  ],
  "disclosure": { "tax_included": false, "shipping_included": false,
                  "fx_locked_seconds": 900 },
  "clarifying_question": null,
  "handoff": null,
  "safety_note": "Please enjoy responsibly.",
  "abstained": false
}
```

**Events:** `assist.message.v1`, `assist.action.proposed.v1`, `assist.action.executed.v1`, `assist.handoff.v1`, `assist.feedback.v1`, `assist.safety.flagged.v1`.

---

## 8. Localization and voice

- 24 launch languages → 60+ by 2030; RTL for Arabic and Hebrew.
- Budget parsing understands local formats (`$80`, `£60`, `80 €`, `¥12,000`).
- Voice: ASR → same pipeline → TTS; confirmation uses a distinct spoken phrase ("Say confirm to place the order"); low ASR confidence triggers repeat.
- WhatsApp/Messenger: actions delivered as interactive buttons with deep links; no payment credentials requested in chat.
- AR label scan handoff: scanned bottle populates `get_product` then Assist offers "find similar", "add to cart" or "ask Sommelier".

---

## 9. Observability and cost

| SLO | Target |
|---|---|
| Availability | 99.95% monthly |
| Message latency p95 / p99 | 2.2 s / 4.5 s |
| Confirmation latency p95 | 800 ms |
| Tool-call success | ≥ 98% |
| Unauthorized actions | 0 |
| Handoff context preservation | 100% |

Cost controls: route narrow intents to self-hosted models; cache catalog searches for 60 s per filter set; cap 15 tool calls/turn; per-tenant budgets; template-based checkout turns (no LLM cost).

Tracing fields: `trace_id`, `session_id`, `intent`, `prompt_version`, `model_hash`, `tool_calls`, `action_id`, `validator_result`.

---

## 10. Rollout plan

| Phase | Window | Deliverables | Exit criteria |
|---|---|---|---|
| **Phase 1** | Q1–Q2 2027 | Discovery, cart actions, Sommelier handoff, EN/FR/ES, deterministic prototype | browser self-test (generated count), task completion ≥ 85%, zero unauthorized actions |
| **Phase 2** | Q3–Q4 2027 | Gifting with age assurance, proactive support, Rewards, subscription fit | Gift suitability ≥ 88%, confirmation compliance 100% |
| **Phase 3** | 2028 | Cross-module handoffs (Trade/Vault/Studio), voice, 12 languages | Handoff context preservation 100%, voice p95 ≤ 3 s |
| **Phase 4** | 2029 | Full conversational commerce, 24 languages, bandit personalization | Cart completion lift ≥ 12% |
| **Phase 5** | 2030–2034 | 60+ languages, 100M users, proactive cross-sell at scale | All SLOs green at scale |

---

## 11. Prototype-to-production mapping

| Prototype element | Production destination |
|---|---|
| `viewAssist()` connected-module panel | Handoff Router + tool registry |
| `assistReply()` intent routing | Intent Extractor + domain handoffs |
| `data-assist` quick actions | Intent pre-fills (`ORDER_SUPPORT`, `GIFT`, `SUBSCRIPTION`) |
| "Open Vintora X →" buttons | `handoff_*` tools with context preservation |
| `state.assist` chat log | Redis session store |
| Safety line "never makes a purchase without confirmation" | Validator + confirmation policy |
| Cart/checkout in prototype | `add_to_cart` → `checkout` pending actions |

---

## 12. Risks and open decisions

| Risk | Mitigation |
|---|---|
| Accidental autonomous purchase | Confirmation gate, idempotency, amount cap, template checkout |
| Upsell perceived as pushy | One suggestion/turn, benefit-framed, decline is final |
| Inaccurate order/delivery claims | Tool-only facts, Flow milestones, no generated dates |
| Gift age assurance gap | Mandatory check before alcohol gift; dry-market block |
| Prompt injection | Input filter, delimiters, tool whitelist, schema validation |
| Handoff context loss | Session snapshot passed on every handoff; verified by test |
| Subscription oversell | Tier capped to stated monthly budget; Vault handoff for collectors |

**Open decisions for Phase 2:**

1. Default session amount cap for confirmations ($2,000 proposed).
2. Whether gifting to a third party requires recipient DOB or only an age confirmation attestation.
3. Which channels may execute purchases (web/mobile yes; WhatsApp with button confirmation?)
4. Whether proactive cross-sell is opt-in by default under GDPR/CCPA.
5. How to present "tax included" pricing in US states with varying rules.

---

## 13. Summary

Vintora Assist is designed as a **confirmation-first, action-capable concierge** covering all six requested features — product discovery, personalized recommendations, transparent upselling, complementary cross-selling, age-assured gift suggestions and Club subscription fit. It is defined by a strict separation between what the LLM may propose and what deterministic services may execute, a whitelisted tool contract, eleven production prompts, eight conversation-flow sections covering all six features plus cart/checkout/support, and cross-module handoffs that preserve context, and evaluation gates that treat unauthorized actions and safety violations as release blockers. The existing prototype and API provide executable contracts for intent routing, product results and safety messaging.
