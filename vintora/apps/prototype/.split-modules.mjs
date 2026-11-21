import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('./', import.meta.url);
const lines = readFileSync(new URL('app.js', root), 'utf8').split(/\r?\n/);
const chunk = (start, end) => lines.slice(start - 1, end).join('\n');

const header = (imports) => `/* Generated from the original zero-dependency app.js — modular ES build. */\n${imports}\n\n`;

const modules = [
  {
    file: 'src/views/catalog.js',
    range: [122, 213],
    imports: `import { state, esc, t, money, getProduct, bottleHTML, productCard, sectionHead } from '../core.js';`,
    exports: ['viewHome', 'viewSearch', 'viewProduct'],
  },
  {
    file: 'src/views/sommelier.js',
    range: [214, 293],
    imports: `import { state, esc, t, money, $, getProduct } from '../core.js';\nimport { render } from '../app.js';`,
    exports: ['viewSommelier', 'sommierReply', 'sommelierReply', 'sendChat'],
  },
  {
    file: 'src/views/checkout.js',
    range: [294, 323],
    imports: `import { state, esc, t, money, bottleHTML, getProduct } from '../core.js';`,
    exports: ['viewCart'],
  },
  {
    file: 'src/views/membership.js',
    range: [324, 373],
    imports: `import { state, D, esc, t, money, getProduct, sectionHead } from '../core.js';`,
    exports: ['viewClub', 'viewVault'],
  },
  {
    file: 'src/views/trade.js',
    range: [374, 547],
    imports: `import { state, D, esc, t, money, toast } from '../core.js';\nimport { render } from '../app.js';`,
    exports: ['tradeTabBar', 'tradeOverview', 'tradeRfqs', 'tradeSuppliers', 'tradeOrders', 'tradeCredit', 'viewTrade', 'TRADE_TABS'],
  },
  {
    file: 'src/views/platform.js',
    range: [548, 632],
    imports: `import { state, D, esc, t, money, toast } from '../core.js';\nimport { render } from '../app.js';`,
    exports: ['viewSeller', 'viewRewards', 'viewStudio'],
  },
  {
    file: 'src/views/assistant.js',
    range: [633, 780],
    imports: `import { state, D, esc, t, money, getProduct } from '../core.js';\nimport { render } from '../app.js';`,
    exports: ['assistReply', 'viewAssist', 'sendAssist', 'viewFlow', 'viewConfirmation', 'ASSIST_QUICK', 'FLOW_SHIPMENTS', 'FLOW_STEPS'],
  },
  {
    file: 'src/views/admin.js',
    range: [782, 1294],
    imports: `import { state, esc, t, $, $$, toast } from '../core.js';\nimport { render } from '../app.js';`,
    exports: ['adminSeedData', 'adminState', 'adminPersist', 'adminFmt', 'adminTime', 'adminLog', 'adminHash', 'adminPill', 'adminTable', 'adminTr', 'adminAttrs', 'adminRowAttrs', 'adminBar', 'adminGuard', 'adminFields', 'adminApplyFilters', 'adminExport', 'adminCommandHTML', 'adminSection', 'adminHandle', 'viewAdmin', 'ADMIN_SECTIONS', 'ADMIN_APPROVERS'],
  },
];

mkdirSync(new URL('src/views/', root), { recursive: true });

for (const mod of modules) {
  let body = chunk(mod.range[0], mod.range[1]);
  body = body.replace(/\bD\.products\b/g, 'state.products');
  const exports = mod.exports.filter((name) => new RegExp(`(?:function|var)\\s+${name}\\b`).test(body));
  const missing = mod.exports.filter((name) => !exports.includes(name));
  if (missing.length) console.warn(`[split] ${mod.file}: not found: ${missing.join(', ')}`);
  writeFileSync(new URL(mod.file, root), header(mod.imports) + body + `\n\nexport { ${exports.join(', ')} };\n`);
  console.log(`[split] ${mod.file}: ${exports.length} exports`);
}

// The final chunk becomes the new modular app entrypoint, patched below.
let app = chunk(1295, 1556);
app = app.replace(/\bD\.products\b/g, 'state.products');
const appImports = `import { state, D, $, $$, t, esc, save, load, toast, useProducts } from './core.js';
import api from './api.js';
import { viewHome, viewSearch, viewProduct } from './views/catalog.js';
import { viewSommelier, sendChat } from './views/sommelier.js';
import { viewCart } from './views/checkout.js';
import { viewClub, viewVault } from './views/membership.js';
import { viewTrade } from './views/trade.js';
import { viewSeller, viewRewards, viewStudio } from './views/platform.js';
import { viewAssist, sendAssist, viewFlow, viewConfirmation } from './views/assistant.js';
import { viewAdmin, adminState, adminFmt, adminApplyFilters, adminCommandHTML, adminHandle } from './views/admin.js';
`;
writeFileSync(new URL('src/app.js', root), header(appImports) + app + '\n');
console.log('[split] src/app.js: entrypoint written');
