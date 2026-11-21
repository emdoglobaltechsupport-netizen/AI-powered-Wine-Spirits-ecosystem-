-- Storefront editorial content, migrated from the former apps/prototype/data.js.
-- Idempotent. Prices/stock/provenance remain in the canonical catalogue tables.
BEGIN;

INSERT INTO product_content (sku, region_label, story, pairings, palate, rating, review_count) VALUES
('sku-1001','Bordeaux, France',
 'A first growth of impeccable lineage: crystalline cassis, cedar and a long mineral finish. One of the most precisely made wines of a celebrated Margaux vintage.',
 ARRAY['Lamb','Beef','Truffle','Hard cheese'], '{"body":5,"dryness":4,"oak":4,"fruit":4}', 4.90, 1284),
('sku-1002','Piedmont, Italy',
 'Nebbiolo at its most articulate: rose and sour cherry over fine tannins, with the savoury lift that makes Barolo so compelling at the table.',
 ARRAY['Braised beef','Mushroom risotto','Aged cheese'], '{"body":4,"dryness":4,"oak":3,"fruit":3}', 4.80, 892),
('sku-1003','Burgundy, France',
 'Steely, saline and precise — a grand cru that tastes unmistakably of its limestone and cool Burgundian morning.',
 ARRAY['Oysters','Scallops','Goat cheese','Sushi'], '{"body":3,"dryness":5,"oak":1,"fruit":3}', 4.70, 611),
('sku-1004','Sicily, Italy',
 'Volcanic, savoury and lifted — the most compelling value in Italian red, grown on the black slopes of Mount Etna.',
 ARRAY['Grilled fish','Tomato pasta','Charcuterie'], '{"body":3,"dryness":4,"oak":2,"fruit":4}', 4.70, 468),
('sku-1005','Rheingau, Germany',
 'Bright, slate-driven Riesling with enough fruit and acidity to be dangerously food-friendly.',
 ARRAY['Spicy food','Pork','Thai curry','Fresh herbs'], '{"body":2,"dryness":4,"oak":0,"fruit":5}', 4.60, 734),
('sku-1006','Sicily, Italy',
 'A deeper, slower expression of Etna: dark fruit and smoke wrapped in fine, chalky tannin.',
 ARRAY['Grilled lamb','Mushroom pasta','Aged cheese'], '{"body":4,"dryness":4,"oak":3,"fruit":3}', 4.80, 312),
('sku-1007','Kyoto, Japan',
 'A revered Japanese single malt: dried fig, sandalwood and incense with an exquisitely long finish.',
 ARRAY['Dark chocolate','Sushi','Cheese'], '{"body":4,"dryness":3,"oak":4,"fruit":4}', 4.90, 2140),
('sku-1008','Japan',
 'The definitive Japanese blend: orchard fruit, honey and quiet woody elegance. A generous gift that rarely misses.',
 ARRAY['Dark chocolate','Sushi','Cheese'], '{"body":3,"dryness":3,"oak":3,"fruit":4}', 4.80, 3190),
('sku-1009','Speyside, Scotland',
 'Rich, sherry-led and unapologetically generous — the crowd-pleasing expression of a Speyside icon.',
 ARRAY['Sticky toffee pudding','Blue cheese','Dark chocolate'], '{"body":4,"dryness":3,"oak":4,"fruit":4}', 4.70, 2870),
('sku-1010','Champagne, France',
 'A finely wound blanc de blancs: citrus, chalk and a slow creamy mousse that flatters almost any table.',
 ARRAY['Oysters','Caviar','Fried chicken','Celebrations'], '{"body":3,"dryness":4,"oak":2,"fruit":4}', 4.80, 1102),
('sku-1011','Oaxaca, Mexico',
 'Earthy, gently smoky and bright with lime — crafted for the dishes that make other drinks disappear.',
 ARRAY['Smoky food','Grilled pineapple','Spicy tacos'], '{"body":3,"dryness":4,"oak":1,"fruit":3}', 4.60, 540),
('sku-1012','Douro, Portugal',
 'A concentrated, fruit-driven vintage port with the structure to evolve for decades.',
 ARRAY['Blue cheese','Dark chocolate','Stilton'], '{"body":5,"dryness":2,"oak":3,"fruit":5}', 4.70, 398)
ON CONFLICT (sku) DO UPDATE SET
  region_label = EXCLUDED.region_label,
  story = EXCLUDED.story,
  pairings = EXCLUDED.pairings,
  palate = EXCLUDED.palate,
  rating = EXCLUDED.rating,
  review_count = EXCLUDED.review_count,
  updated_at = now();

COMMIT;
