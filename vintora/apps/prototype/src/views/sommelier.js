/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, esc, t, money, $, getProduct } from '../core.js';
import { RESPONSIBLE_DRINKING_NOTICE, RECOMMENDATION_LABEL, screenAiReply } from '../ai-safety.js';
import { render } from '../app.js';

  function viewSommelier() {
    var log = state.chat.map(function (m) {
      var recs = m.ids && m.ids.length ? '<div class="chat-recs">' + m.ids.map(function (id) {
        var p = getProduct(id);
        return '<div class="chat-rec" data-product="' + id + '"><span class="pill gold">' + money(p.price) + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.region) + ' · ' + p.rating + '★ · provenance ' + p.provenance + '</small></span></div>';
      }).join('') + '</div>' : '';
      return '<div class="bubble ' + m.role + '">' + m.text + (m.source ? '<div class="source">' + m.source + '</div>' : '') + recs + '</div>';
    }).join('');

    if (!state.chat.length) {
      log = '<div class="bubble bot">Bonjour — I am your Vintora Sommelier. I have read 300 million graph edges covering producers, vintages, appellations and tasting notes. Tell me what you are eating, what you liked before, or your budget, and I will find something worth opening. <div class="source">Grounded in the Vintora Wine Knowledge Graph · citations shown on every answer</div></div>';
    }

    var sideRecs = [state.products[4], state.products[5], state.products[8]];
    return '<div class="section-head"><div><h1 class="serif" style="font-size:36px;margin:0">Vintora Sommelier</h1><p>Conversational, multilingual, and grounded in verified provenance.</p></div>' +
        '<span class="pill green">● Online · EN / FR / ES · Voice ready</span></div>' +
      '<div class="chat-shell">' +
        '<div class="chat-panel">' +
          '<div class="chat-head"><span class="avatar">S</span><div><strong>Sommelier</strong><div class="product-sub">Powered by retrieval over the wine knowledge graph</div></div>' +
            '<span class="pill gold" style="margin-left:auto">Taste profile 82%</span></div>' +
          '<div class="chat-log" id="chat-log">' + log + '</div>' +
          '<div class="composer">' +
            '<div class="suggestions">' +
              '<button data-suggest="I like Northern Rhône Syrah — what should I try next?">Rhône Syrah</button>' +
              '<button data-suggest="What works with spicy Thai food?">Spicy food</button>' +
              '<button data-suggest="A gift under $100 for a whisky lover">Gift under $100</button>' +
              '<button data-suggest="A bottle worth cellaring for 15 years">Cellar for 15 years</button>' +
            '</div>' +
            '<form class="composer-row" id="chat-form"><input id="chat-input" placeholder="Ask about a grape, a dish, an occasion…" aria-label="Message the sommelier" autocomplete="off">' +
              '<button class="btn btn-primary" type="submit">' + t('send') + ' →</button></form>' +
            '<div class="safety-note">' + RESPONSIBLE_DRINKING_NOTICE + ' Prototype age gate only.</div>' +
          '</div>' +
        '</div>' +
        '<aside class="stack">' +
          '<div class="card"><p class="eyebrow">YOUR TASTE PROFILE</p><strong>Confidence 82%</strong>' +
            '<p class="muted" style="font-size:12px">Learned from 14 tastings and 6 explicit preferences. You lean toward savoury, structured reds with moderate oak.</p>' +
            '<div class="stack">' + [['Body', 4], ['Dryness', 4], ['Oak', 3], ['Fruit', 3]].map(function (b) {
              return '<div><div class="spread" style="font-size:10px"><span>' + b[0] + '</span><span>' + b[1] + '/5</span></div><div class="meter"><span style="width:' + (b[1] * 20) + '%"></span></div></div>';
            }).join('') + '</div>' +
            '<button class="link-btn" style="margin-top:12px">Edit or export profile →</button></div>' +
          '<div class="card"><p class="eyebrow">SOMMELIER PICKS</p><div class="chat-recs">' + sideRecs.map(function (p) {
            return '<div class="chat-rec" data-product="' + p.id + '"><span class="pill gold">' + money(p.price) + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(p.region) + '</small></span></div>';
          }).join('') + '</div></div>' +
        '</aside>' +
      '</div>';
  }

  function sommelierReply(text) {
    var q = (text || '').toLowerCase();
    if (/spicy|thai|chilli|curry|mexic/.test(q)) {
      return { text: 'For heat, reach for high acidity and low tannin — tannin amplifies chilli burn. My pick is the <strong>Riesling Kabinett Trocken</strong> from the Rheingau: lime, slate and enough fruit to cool the palate. The <strong>Mezcal Espadín</strong> is the adventurous alternative when the dish is smoky rather than sweet.', source: 'Sources: Rheingau QbA tasting panel · pairing graph edge PAIRS_WITH(Spicy) · 4,812 verified reviews', ids: ['sku-1005', 'sku-1011'] };
    }
    if (/rhône|rhone|syrah|northern/.test(q)) {
      return { text: 'If Northern Rhône Syrah is your reference point, the savoury, pepper-driven profile points to two paths. Stay near home with <strong>Etna Rosso</strong> — ash, blood orange and wild strawberry from volcanic soils. Or cross to Barolo, where Nebbiolo offers rose, tar and the same savoury gravity. I would start with Etna for value and Barolo for the long evening.', source: 'Sources: knowledge graph SIMILAR_TO(Syrah → Nerello Mascalese, Nebbiolo) · provenance verified', ids: ['sku-1006', 'sku-1002'] };
    }
    if (/gift|present|under \$?100| whisky/.test(q)) {
      return { text: 'For a whisky lover, <strong>Hibiki Harmony</strong> is the confident gift: orchard fruit, honey and sandalwood, beautifully presented and widely adored. If you want something rarer and can stretch the budget, <strong>Macallan 12 Sherry Cask</strong> delivers the richer, sherry-led style. Both arrive with verified custody and gift packaging.', source: 'Sources: 3,190 + 2,870 verified tastings · gifting propensity model · custody records', ids: ['sku-1008', 'sku-1009'] };
    }
    if (/cellar|15 year|age|invest|vintage/.test(q)) {
      return { text: 'For a 15-year horizon, buy on provenance and structure, not fashion. <strong>Château Margaux 2016</strong> is a first growth with the tannic architecture and verified bonded custody to reward patience; our Vault liquidity score is 88/100. <strong>Barolo Cannubi 2018</strong> offers a lower entry point with similar longevity.', source: 'Sources: Vault price model · liquidity score · provenance chain 99/100 · bonded custody, Geneva', ids: ['sku-1001', 'sku-1002'] };
    }
    if (/champagne|celebrat|bubble|sparkl/.test(q)) {
      return { text: 'For a celebration, <strong>Champagne Blanc de Blancs 2016</strong> is hard to beat: brioche, lemon zest and chalk with a slow, creamy mousse. It also pairs with everything from oysters to fried chicken, which makes it a generous choice when you are not sure what is being served.', source: 'Sources: Champagne AOC panel · PAIRS_WITH(Celebration, Oysters) · 1,102 verified tastings', ids: ['sku-1010'] };
    }
    if (/under \$?50|everyday|cheap|value/.test(q)) {
      return { text: 'For an everyday bottle with above-its-price character, take the <strong>Etna Rosso</strong> — volcanic, savoury and food-flexible at $44. If you prefer white, the <strong>Riesling Kabinett</strong> at $32 is the most versatile bottle in the catalogue.', source: 'Sources: price-to-quality ranking · 468 + 734 verified tastings', ids: ['sku-1006', 'sku-1005'] };
    }
    return { text: 'Based on your taste profile — savoury, structured, moderate oak — I would begin with <strong>Barolo Cannubi 2018</strong>. It has the rose-and-tar lift you enjoy in Rhône wines, with a finer tannin line. If you are cooking tonight, tell me the dish and I will narrow it further.', source: 'Sources: taste embedding similarity · 300M-edge knowledge graph · 892 verified tastings', ids: ['sku-1002', 'sku-1006'] };
  }

  function sendChat(text) {
    if (!text || !text.trim()) return;
    var reply = screenAiReply(
      sommelierReply(text),
      'I cannot give that recommendation safely. Ask about a grape, a dish, an occasion or a budget.'
    );
    state.chat.push({ role: 'user', text: esc(text.trim()) });
    state.chat.push({
      role: 'bot',
      text: reply.text,
      source: (reply.source || 'Sources: deterministic catalogue adapter') + ' · ' + reply.tierLabel,
      ids: reply.ids,
      actionTier: reply.actionTier,
      blocked: Boolean(reply.blocked),
    });
    render();
    var log = $('#chat-log');
    if (log) log.scrollTop = log.scrollHeight;
  }


export { viewSommelier, sommelierReply, sendChat };
