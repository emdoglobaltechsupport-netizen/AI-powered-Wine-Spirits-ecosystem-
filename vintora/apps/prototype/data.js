/* =========================================================================
   VINTORA prototype — local catalogue + reference data.
   Zero dependencies. No network. All figures are illustrative prototype data.
   Product names, ratings and prices are fictional demo content.
   ========================================================================= */
const D = (function () {
  'use strict';

  var products = [
    {
      id: 'sku-1001', name: 'Château Margaux', producer: 'Château Margaux',
      region: 'Bordeaux, France', appellation: 'Margaux AOC', vintage: 2016,
      type: 'Red Wine', grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'],
      price: 1290, rating: 4.9, reviews: 1284, stock: 12, provenance: 99, liquidity: 88,
      liquid: '#4a1024',
      palate: { body: 5, dryness: 4, oak: 4, fruit: 4 },
      notes: ['Blackcurrant', 'Cedar', 'Violet', 'Graphite'],
      pairings: ['Lamb', 'Beef', 'Truffle', 'Hard cheese'],
      story: 'A first growth of impeccable lineage: crystalline cassis, cedar and a long mineral finish. One of the most precisely made wines of a celebrated Margaux vintage.',
      custody: 'Bonded warehouse, Geneva · 12.5°C · insured'
    },
    {
      id: 'sku-1002', name: 'Barolo Cannubi', producer: 'Piero Falletti',
      region: 'Piedmont, Italy', appellation: 'Barolo DOCG', vintage: 2018,
      type: 'Red Wine', grapes: ['Nebbiolo'],
      price: 168, rating: 4.8, reviews: 892, stock: 34, provenance: 96, liquidity: 74,
      liquid: '#6b2330',
      palate: { body: 4, dryness: 4, oak: 3, fruit: 3 },
      notes: ['Rose petal', 'Tar', 'Cherry', 'Leather'],
      pairings: ['Braised beef', 'Mushroom risotto', 'Aged cheese'],
      story: 'Nebbiolo at its most articulate: rose and sour cherry over fine tannins, with the savoury lift that makes Barolo so compelling at the table.',
      custody: 'Bonded warehouse, Alba · 12°C · insured'
    },
    {
      id: 'sku-1003', name: 'Chablis Grand Cru Les Clos', producer: 'Domaine Sévrine',
      region: 'Burgundy, France', appellation: 'Chablis Grand Cru', vintage: 2020,
      type: 'White Wine', grapes: ['Chardonnay'],
      price: 142, rating: 4.7, reviews: 611, stock: 21, provenance: 97, liquidity: 71,
      liquid: '#c9a94a',
      palate: { body: 3, dryness: 5, oak: 1, fruit: 3 },
      notes: ['Oyster shell', 'Lemon', 'Chalk', 'White flower'],
      pairings: ['Oysters', 'Scallops', 'Goat cheese', 'Sushi'],
      story: 'Steely, saline and precise — a grand cru that tastes unmistakably of its limestone and cool Burgundian morning.',
      custody: 'Bonded warehouse, Paris · 11°C · insured'
    },
    {
      id: 'sku-1004', name: 'Etna Rosso', producer: 'Tenuta del Vulcano',
      region: 'Sicily, Italy', appellation: 'Etna DOC', vintage: 2021,
      type: 'Red Wine', grapes: ['Nerello Mascalese'],
      price: 44, rating: 4.7, reviews: 468, stock: 76, provenance: 95, liquidity: 66,
      liquid: '#7a2a35',
      palate: { body: 3, dryness: 4, oak: 2, fruit: 4 },
      notes: ['Wild strawberry', 'Ash', 'Blood orange', 'Pepper'],
      pairings: ['Grilled fish', 'Tomato pasta', 'Charcuterie'],
      story: 'Volcanic, savoury and lifted — the most compelling value in Italian red, grown on the black slopes of Mount Etna.',
      custody: 'Bonded warehouse, Milan · 12°C · insured'
    },
    {
      id: 'sku-1005', name: 'Riesling Kabinett Trocken', producer: 'Weingut Rheingau',
      region: 'Rheingau, Germany', appellation: 'Rheingau QbA', vintage: 2022,
      type: 'White Wine', grapes: ['Riesling'],
      price: 32, rating: 4.6, reviews: 734, stock: 120, provenance: 94, liquidity: 60,
      liquid: '#d8bf5a',
      palate: { body: 2, dryness: 4, oak: 0, fruit: 5 },
      notes: ['Lime', 'Green apple', 'Slate', 'Honeysuckle'],
      pairings: ['Spicy food', 'Pork', 'Thai curry', 'Fresh herbs'],
      story: 'Bright, slate-driven Riesling with enough fruit and acidity to be dangerously food-friendly.',
      custody: 'Bonded warehouse, Frankfurt · 10°C · insured'
    },
    {
      id: 'sku-1006', name: 'Etna Rosso Riserva', producer: 'Tenuta del Vulcano',
      region: 'Sicily, Italy', appellation: 'Etna DOC', vintage: 2019,
      type: 'Red Wine', grapes: ['Nerello Mascalese'],
      price: 92, rating: 4.8, reviews: 312, stock: 18, provenance: 97, liquidity: 72,
      liquid: '#6b2230',
      palate: { body: 4, dryness: 4, oak: 3, fruit: 3 },
      notes: ['Sour cherry', 'Ash', 'Dried herbs', 'Iron'],
      pairings: ['Grilled lamb', 'Mushroom pasta', 'Aged cheese'],
      story: 'A deeper, slower expression of Etna: dark fruit and smoke wrapped in fine, chalky tannin.',
      custody: 'Bonded warehouse, Milan · 12°C · insured'
    },
    {
      id: 'sku-1007', name: 'Yamazaki 18 Year Old', producer: 'Suntory',
      region: 'Kyoto, Japan', appellation: 'Japanese Single Malt', vintage: null,
      type: 'Spirits', grapes: [],
      price: 780, rating: 4.9, reviews: 2140, stock: 8, provenance: 99, liquidity: 93,
      liquid: '#a85f22',
      palate: { body: 4, dryness: 3, oak: 4, fruit: 4 },
      notes: ['Mizunara oak', 'Dried fig', 'Incense', 'Toffee'],
      pairings: ['Dark chocolate', 'Sushi', 'Cheese'],
      story: 'A revered Japanese single malt: dried fig, sandalwood and incense with an exquisitely long finish.',
      custody: 'Bonded warehouse, Tokyo · 15°C · insured'
    },
    {
      id: 'sku-1008', name: 'Hibiki Harmony', producer: 'Suntory',
      region: 'Japan', appellation: 'Japanese Blended Whisky', vintage: null,
      type: 'Spirits', grapes: [],
      price: 78, rating: 4.8, reviews: 3190, stock: 210, provenance: 97, liquidity: 85,
      liquid: '#c28433',
      palate: { body: 3, dryness: 3, oak: 3, fruit: 4 },
      notes: ['Honey', 'Orange blossom', 'Sandalwood', 'Mizunara'],
      pairings: ['Dark chocolate', 'Sushi', 'Cheese'],
      story: 'The definitive Japanese blend: orchard fruit, honey and quiet woody elegance. A generous gift that rarely misses.',
      custody: 'Bonded warehouse, Singapore · 15°C · insured'
    },
    {
      id: 'sku-1009', name: 'Macallan 12 Sherry Cask', producer: 'The Macallan',
      region: 'Speyside, Scotland', appellation: 'Single Malt Scotch', vintage: null,
      type: 'Spirits', grapes: [],
      price: 96, rating: 4.7, reviews: 2870, stock: 132, provenance: 98, liquidity: 88,
      liquid: '#8f3d18',
      palate: { body: 4, dryness: 3, oak: 4, fruit: 4 },
      notes: ['Dried raisin', 'Orange peel', 'Walnut', 'Cocoa'],
      pairings: ['Sticky toffee pudding', 'Blue cheese', 'Dark chocolate'],
      story: 'Rich, sherry-led and unapologetically generous — the crowd-pleasing expression of a Speyside icon.',
      custody: 'Bonded warehouse, London · 14°C · insured'
    },
    {
      id: 'sku-1010', name: 'Champagne Blanc de Blancs', producer: 'Maison du Clos',
      region: 'Champagne, France', appellation: 'Champagne AOC', vintage: 2016,
      type: 'Sparkling', grapes: ['Chardonnay'],
      price: 118, rating: 4.8, reviews: 1102, stock: 64, provenance: 98, liquidity: 79,
      liquid: '#e0cf86',
      palate: { body: 3, dryness: 4, oak: 2, fruit: 4 },
      notes: ['Brioche', 'Lemon zest', 'Chalk', 'Almond'],
      pairings: ['Oysters', 'Caviar', 'Fried chicken', 'Celebrations'],
      story: 'A finely wound blanc de blancs: citrus, chalk and a slow creamy mousse that flatters almost any table.',
      custody: 'Bonded warehouse, Reims · 11°C · insured'
    },
    {
      id: 'sku-1011', name: 'Mezcal Espadín Joven', producer: 'Casa Agave',
      region: 'Oaxaca, Mexico', appellation: 'Mezcal D.O.', vintage: null,
      type: 'Spirits', grapes: [],
      price: 62, rating: 4.6, reviews: 540, stock: 88, provenance: 93, liquidity: 64,
      liquid: '#d7c89a',
      palate: { body: 3, dryness: 4, oak: 1, fruit: 3 },
      notes: ['Smoke', 'Green chilli', 'Lime', 'Roast agave'],
      pairings: ['Smoky food', 'Grilled pineapple', 'Spicy tacos'],
      story: 'Earthy, gently smoky and bright with lime — crafted for the dishes that make other drinks disappear.',
      custody: 'Bonded warehouse, Mexico City · 18°C · insured'
    },
    {
      id: 'sku-1012', name: 'Vintage Port', producer: 'Casa do Douro',
      region: 'Douro, Portugal', appellation: 'Porto DOC', vintage: 2017,
      type: 'Fortified', grapes: ['Touriga Nacional', 'Tinta Roriz'],
      price: 88, rating: 4.7, reviews: 398, stock: 42, provenance: 96, liquidity: 70,
      liquid: '#5a1225',
      palate: { body: 5, dryness: 2, oak: 3, fruit: 5 },
      notes: ['Blackberry', 'Plum', 'Cocoa', 'Violet'],
      pairings: ['Blue cheese', 'Dark chocolate', 'Stilton'],
      story: 'A concentrated, fruit-driven vintage port with the structure to evolve for decades.',
      custody: 'Bonded warehouse, Porto · 14°C · insured'
    }
  ];

  // Static fallback catalogue is isolated from licensed/verified/live inventory.
  // Every bundled row carries the same seed provenance and is never purchasable.
  var catalogueSource = {
    dataClass: 'demo',
    fixtureClass: 'demo',
    sourceClass: 'seed',
    sourceRef: 'apps/prototype/data.js',
    sourceLabel: 'Seed demo record — illustrative prototype data; not licensed or verified.',
    freshnessAsOf: 'prototype snapshot — 2026-11-21; no live feed',
    licenceEvidence: null,
    verifiedAt: null,
    purchasable: false,
    externalCheckoutBlocked: true,
    checkoutMode: 'simulation_only'
  };

  products.forEach(function (product) {
    Object.keys(catalogueSource).forEach(function (key) {
      product[key] = catalogueSource[key];
    });
  });

  var currencies = {
    USD: { symbol: '$', rate: 1 },
    EUR: { symbol: '€', rate: 0.92 },
    GBP: { symbol: '£', rate: 0.79 },
    SGD: { symbol: 'S$', rate: 1.34 },
    JPY: { symbol: '¥', rate: 149 },
    AUD: { symbol: 'A$', rate: 1.52 },
    AED: { symbol: 'د.إ', rate: 3.67 },
    BRL: { symbol: 'R$', rate: 5.05 }
  };

  var locales = {
    en: {
      discover: 'Discover', market: 'Market', sommelier: 'Sommelier', club: 'Club', vault: 'Vault',
      trade: 'Trade', sellMore: 'Sell', rewards: 'Rewards', studio: 'Studio', cart: 'Cart',
      heroTitle: 'The world’s cellar, intelligent.', heroSub: 'One Sommelier for every bottle. Ten connected modules for the entire wine and spirits journey — from first discovery to verified provenance, global delivery and your own cellar.',
      findWine: 'Ask the Sommelier', shopByMood: 'Shop by moment', curated: 'Curated for your palate', trending: 'Trending now',
      addToCart: 'Add to cart', askSommelier: 'Ask Sommelier', send: 'Send', subtotal: 'Subtotal',
      checkout: 'Secure checkout', emptyCart: 'Ask the Sommelier to find a bottle for your next occasion.',
      added: 'Added to your cellar', demo: 'Prototype mode — no real orders are placed.',
      lockedRate: 'Locked FX rate — your total is guaranteed for 15 minutes at checkout.',
      yourPalate: 'The world’s cellar, intelligent.',
      portfolio: 'Portfolio value', liquidity: 'Liquidity', points: 'points', tier: 'Tier',
      requestQuote: 'Publish RFQ', compliance: 'Compliance check', generateCopy: 'Generate draft',
      liveListings: 'Live listings',
      validationError: 'Enter a valid date of birth and choose your country.',
      tooYoung: 'Sorry — you must meet the legal drinking age in your country to enter.',
      ageTitle: 'Welcome to Vintora', ageQuestion: 'Are you of legal drinking age in your country?',
      dateOfBirth: 'Date of birth', country: 'Country / region', enter: 'Enter Vintora',
      responsible: 'Please enjoy responsibly. By entering you agree to our Terms and Privacy Policy.',
      search: 'Search the cellar…', seller: 'Seller', assist: 'Assist', flow: 'Flow'
    },
    fr: {
      discover: 'Découvrir', market: 'Marché', sommelier: 'Sommelier', club: 'Club', vault: 'Cave',
      trade: 'Professionnels', sellMore: 'Vendre', rewards: 'Fidélité', studio: 'Studio', cart: 'Panier',
      heroTitle: 'La cave du monde, intelligente.', heroSub: 'Un sommelier pour chaque bouteille. Dix modules connectés pour tout le parcours du vin et des spiritueux — de la découverte à la provenance vérifiée.',
      findWine: 'Demander au sommelier', shopByMood: 'Choisir un moment', curated: 'Sélection pour vous', trending: 'Tendances',
      addToCart: 'Ajouter', askSommelier: 'Demander', send: 'Envoyer', subtotal: 'Sous-total',
      checkout: 'Commande sécurisée', emptyCart: 'Demandez au sommelier de trouver une bouteille pour votre prochaine occasion.',
      added: 'Ajouté à votre cave', demo: 'Mode prototype — aucune commande réelle n’est passée.',
      lockedRate: 'Taux de change garanti — votre total est fixé pendant 15 minutes.',
      yourPalate: 'La cave du monde, intelligente.',
      portfolio: 'Valeur du portefeuille', liquidity: 'Liquidité', points: 'points', tier: 'Niveau',
      requestQuote: 'Publier la demande', compliance: 'Contrôle de conformité', generateCopy: 'Générer un brouillon',
      liveListings: 'Annonces actives',
      validationError: 'Saisissez une date de naissance valide et choisissez votre pays.',
      tooYoung: 'Désolé — vous devez avoir l’âge légal de consommation dans votre pays.',
      ageTitle: 'Bienvenue chez Vintora', ageQuestion: 'Avez-vous l’âge légal de consommation dans votre pays ?',
      dateOfBirth: 'Date de naissance', country: 'Pays / région', enter: 'Entrer chez Vintora',
      responsible: 'À consommer avec modération. En entrant, vous acceptez nos conditions et notre politique de confidentialité.',
      search: 'Rechercher dans la cave…', seller: 'Vendeurs', assist: 'Assistant', flow: 'Logistique'
    },
    es: {
      discover: 'Descubrir', market: 'Mercado', sommelier: 'Sommelier', club: 'Club', vault: 'Bodega',
      trade: 'Profesionales', sellMore: 'Vender', rewards: 'Recompensas', studio: 'Estudio', cart: 'Carrito',
      heroTitle: 'La bodega del mundo, inteligente.', heroSub: 'Un sumiller para cada botella. Diez módulos conectados para todo el recorrido del vino y las bebidas espirituosas.',
      findWine: 'Preguntar al sumiller', shopByMood: 'Según el momento', curated: 'Selección para ti', trending: 'Tendencias',
      addToCart: 'Añadir', askSommelier: 'Preguntar', send: 'Enviar', subtotal: 'Subtotal',
      checkout: 'Pago seguro', emptyCart: 'Pide al sumiller que encuentre una botella para tu próxima ocasión.',
      added: 'Añadido a tu bodega', demo: 'Modo prototipo — no se realizan pedidos reales.',
      lockedRate: 'Tipo de cambio bloqueado — total garantizado durante 15 minutos.',
      yourPalate: 'La bodega del mundo, inteligente.',
      portfolio: 'Valor de la cartera', liquidity: 'Liquidez', points: 'puntos', tier: 'Nivel',
      requestQuote: 'Publicar solicitud', compliance: 'Control de cumplimiento', generateCopy: 'Generar borrador',
      liveListings: 'Anuncios activos',
      validationError: 'Introduce una fecha de nacimiento válida y elige tu país.',
      tooYoung: 'Lo sentimos — debes tener la edad legal para beber en tu país.',
      ageTitle: 'Bienvenido a Vintora', ageQuestion: '¿Tienes la edad legal para beber en tu país?',
      dateOfBirth: 'Fecha de nacimiento', country: 'País / región', enter: 'Entrar en Vintora',
      responsible: 'Disfruta con responsabilidad. Al entrar aceptas nuestros términos y política de privacidad.',
      search: 'Buscar en la bodega…', seller: 'Vendedores', assist: 'Asistente', flow: 'Logística'
    }
  };

  var occasions = [
    { icon: '🥩', label: 'Steak night', query: 'A bold red for a steak dinner' },
    { icon: '🌶️', label: 'Spicy food', query: 'What works with spicy Thai food?' },
    { icon: '🎉', label: 'Celebration', query: 'Champagne for a celebration' },
    { icon: '🎁', label: 'Gifting', query: 'A gift under $100 for a whisky lover' },
    { icon: '🌊', label: 'By the sea', query: 'A crisp white to drink by the sea' },
    { icon: '🕯️', label: 'Cellaring', query: 'A bottle worth cellaring for 15 years' }
  ];

  var clubTiers = [
    { name: 'Good', bottles: '2 bottles', price: 29, note: 'Your first step into curated discovery.', accent: '#6B7A5E' },
    { name: 'Better', bottles: '3 bottles', price: 59, note: 'The sweet spot: range, value and surprise.', accent: '#5B1A2B', popular: true },
    { name: 'Best', bottles: '3 premium bottles', price: 119, note: 'Serious bottles, detailed tasting notes.', accent: '#C9A227' },
    { name: 'Icon', bottles: '2 rare bottles', price: 199, note: 'Allocations and experiences you cannot buy.', accent: '#3E0F1C' }
  ];

  var vaultLots = [
    { productId: 'sku-1001', qty: 3, value: 3975, change: 12.4, liquidity: 88, years: 6 },
    { productId: 'sku-1007', qty: 1, value: 2440, change: 9.1, liquidity: 93, years: 4 },
    { productId: 'sku-1002', qty: 12, value: 2076, change: 6.8, liquidity: 74, years: 3 }
  ];

  // Vintora Trade — B2B wholesale demo data.
  var trade = {
    suppliers: [
      { id: 'sup-01', name: 'Meridian Wine Co.', market: 'Bordeaux, FR', categories: ['Red Wine', 'Sparkling'], rating: 4.8, orders: 142, onTime: 97, terms: 'Net 30', moq: 5, lead: 12, verified: true },
      { id: 'sup-02', name: 'Casa Vino SRL', market: 'Piedmont, IT', categories: ['Red Wine'], rating: 4.9, orders: 318, onTime: 99, terms: 'Net 45', moq: 3, lead: 9, verified: true },
      { id: 'sup-03', name: 'Clos Distribution', market: 'Burgundy, FR', categories: ['White Wine', 'Sparkling'], rating: 4.7, orders: 96, onTime: 95, terms: 'Net 30', moq: 6, lead: 14, verified: true },
      { id: 'sup-04', name: 'Nippon Spirits KK', market: 'Kyoto, JP', categories: ['Spirits'], rating: 4.9, orders: 74, onTime: 98, terms: 'Net 60', moq: 2, lead: 21, verified: true },
      { id: 'sup-05', name: 'Etna Export Group', market: 'Sicily, IT', categories: ['Red Wine'], rating: 4.6, orders: 211, onTime: 94, terms: 'Net 30', moq: 8, lead: 11, verified: true },
      { id: 'sup-06', name: 'Douro Direct Lda', market: 'Douro, PT', categories: ['Fortified', 'Red Wine'], rating: 4.7, orders: 63, onTime: 96, terms: 'Net 30', moq: 4, lead: 16, verified: false }
    ],
    rfqs: [
      { id: 'RFQ-2041', productId: 'sku-1002', cases: 24, market: 'London, UK', target: 152, status: 'Quotes received', quotes: 3, created: '18 Nov', incoterm: 'DAP' },
      { id: 'RFQ-2040', productId: 'sku-1005', cases: 60, market: 'New York, US', target: 26, status: 'Awarded', quotes: 5, created: '15 Nov', incoterm: 'DDP' },
      { id: 'RFQ-2039', productId: 'sku-1010', cases: 12, market: 'Singapore', target: 98, status: 'Open', quotes: 1, created: '12 Nov', incoterm: 'DAP' },
      { id: 'RFQ-2038', productId: 'sku-1004', cases: 40, market: 'Paris, FR', target: 34, status: 'Draft', quotes: 0, created: '09 Nov', incoterm: 'DAP' }
    ],
    quotes: [
      { id: 'Q-8812', rfqId: 'RFQ-2041', supplier: 'Meridian Wine Co.', price: 152, incoterm: 'DAP London', lead: 12, moq: 5, rating: 4.8, valid: '27 Nov', saving: 0 },
      { id: 'Q-8813', rfqId: 'RFQ-2041', supplier: 'Casa Vino SRL', price: 148, incoterm: 'DDP London', lead: 9, moq: 3, rating: 4.9, valid: '25 Nov', saving: 4 },
      { id: 'Q-8814', rfqId: 'RFQ-2041', supplier: 'Etna Export Group', price: 139, incoterm: 'DAP London', lead: 16, moq: 8, rating: 4.6, valid: '29 Nov', saving: 13 },
      { id: 'Q-8809', rfqId: 'RFQ-2040', supplier: 'Clos Distribution', price: 24, incoterm: 'DDP New York', lead: 14, moq: 6, rating: 4.7, valid: 'Awarded', saving: 2 },
      { id: 'Q-8802', rfqId: 'RFQ-2039', supplier: 'Nippon Spirits KK', price: 96, incoterm: 'DAP Singapore', lead: 21, moq: 2, rating: 4.9, valid: '03 Dec', saving: 2 }
    ],
    pos: [
      { id: 'PO-7821', supplier: 'Casa Vino SRL', items: 'Etna Rosso 2021 · 60 bottles', value: 2640, status: 'In transit', eta: '24 Nov', incoterm: 'DDP London' },
      { id: 'PO-7818', supplier: 'Meridian Wine Co.', items: 'Barolo Cannubi 2018 · 24 bottles', value: 3552, status: 'Customs', eta: '27 Nov', incoterm: 'DAP London' },
      { id: 'PO-7804', supplier: 'Clos Distribution', items: 'Riesling Kabinett · 120 bottles', value: 2880, status: 'Delivered', eta: '12 Nov', incoterm: 'DDP New York' }
    ]
  };

  return {
    products: products,
    catalogueSource: catalogueSource,
    currencies: currencies,
    locales: locales,
    occasions: occasions,
    clubTiers: clubTiers,
    vaultLots: vaultLots,
    trade: trade
  };
})();

export default D;
window.VINTORA_DATA = D;
