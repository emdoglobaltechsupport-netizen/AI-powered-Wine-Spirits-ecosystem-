/* Generated from the original zero-dependency app.js — modular ES build. */
import { state, esc, t, money, bottleHTML, getProduct } from '../core.js';

  function viewCart() {
    var ids = Object.keys(state.cart);
    if (!ids.length) {
      return '<div class="section-head"><h1 class="serif" style="font-size:36px;margin:0">Your cellar</h1></div>' +
        '<div class="card" style="text-align:center;padding:60px 20px"><div style="font-size:46px">▣</div><h2 class="serif">Your cellar is empty</h2><p class="muted">' + t('emptyCart') + '</p><button class="btn btn-primary" data-view="sommelier">Ask the Sommelier →</button></div>';
    }
    var lines = ids.map(function (id) {
      var p = getProduct(id), qty = state.cart[id];
      return '<div class="cart-line">' + bottleHTML(p) +
        '<div class="line-info"><strong>' + esc(p.name) + '</strong><div class="product-sub">' + esc(p.region) + ' · provenance ' + p.provenance + '</div>' +
        '<div class="row" style="margin-top:6px"><span class="qty"><button data-qty="-1" data-id="' + id + '" aria-label="Decrease">−</button><span>' + qty + '</span><button data-qty="1" data-id="' + id + '" aria-label="Increase">+</button></span>' +
        '<button class="link-btn" data-remove="' + id + '">Remove</button></div></div>' +
        '<strong>' + money(p.price * qty) + '</strong></div>';
    }).join('');
    var subtotal = ids.reduce(function (a, id) { return a + getProduct(id).price * state.cart[id]; }, 0);
    var shipping = subtotal > 250 ? 0 : 18;
    return '<div class="section-head"><h1 class="serif" style="font-size:36px;margin:0">Your cellar</h1><p>Age-verified delivery · temperature-controlled · insured</p></div>' +
      '<div class="cart-layout"><div class="card">' + lines + '</div>' +
      '<aside class="card summary"><p class="eyebrow">ORDER SUMMARY</p>' +
        '<div class="row" style="justify-content:space-between"><span>' + t('subtotal') + '</span><strong>' + money(subtotal) + '</strong></div>' +
        '<div class="row" style="justify-content:space-between"><span>Temperature-controlled delivery</span><strong>' + (shipping ? money(shipping) : 'Complimentary') + '</strong></div>' +
        '<div class="row" style="justify-content:space-between"><span>Insured value (0.6%)</span><strong>' + money(subtotal * 0.006) + '</strong></div>' +
        '<hr style="border:0;border-top:1px solid var(--border);margin:14px 0">' +
        '<div class="row" style="justify-content:space-between"><strong>Total</strong><strong class="price">' + money(subtotal + shipping + subtotal * 0.006) + '</strong></div>' +
        '<p class="fine-print" style="margin:12px 0">🔒 ' + t('lockedRate') + '</p>' +
        '<p class="fine-print" style="margin:0 0 12px"><strong>Simulation only:</strong> seed demo rows are not purchasable and no verified inventory or live PSP is connected.</p>' +
        '<button class="btn btn-primary btn-block" id="checkout-btn">' + t('checkout') + ' →</button>' +
        '<p class="fine-print" style="text-align:center;margin-top:10px">' + t('demo') + '</p>' +
      '</aside></div>';
  }


export { viewCart };
