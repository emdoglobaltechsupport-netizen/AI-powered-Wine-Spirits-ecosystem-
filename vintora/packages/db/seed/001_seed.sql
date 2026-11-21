-- VINTORA Phase 1 seed data. Mirrors apps/prototype/data.js and the API catalogue.
-- Safe to re-run (idempotent upserts). All data is illustrative demo content.
BEGIN;

INSERT INTO currencies (code, name, symbol, minor_units) VALUES
  ('USD','US Dollar','$',2), ('EUR','Euro','€',2), ('GBP','British Pound','£',2),
  ('SGD','Singapore Dollar','S$',2), ('JPY','Japanese Yen','¥',0),
  ('AUD','Australian Dollar','A$',2), ('AED','UAE Dirham','د.إ',2), ('BRL','Brazilian Real','R$',2),
  ('CHF','Swiss Franc','CHF',2)
ON CONFLICT (code) DO NOTHING;

INSERT INTO countries (code, name, minimum_drinking_age, currency_code, is_launch_market) VALUES
  ('US','United States',21,'USD',true), ('GB','United Kingdom',18,'GBP',true),
  ('SG','Singapore',18,'SGD',true), ('FR','France',18,'EUR',true),
  ('DE','Germany',18,'EUR',true), ('IT','Italy',18,'EUR',true),
  ('ES','Spain',18,'EUR',true), ('NL','Netherlands',18,'EUR',true),
  ('JP','Japan',20,'JPY',false), ('AE','United Arab Emirates',21,'AED',false),
  ('AU','Australia',18,'AUD',false), ('BR','Brazil',18,'BRL',false),
  ('CA','Canada',19,'USD',false), ('ZA','South Africa',18,'USD',false),
  ('MX','Mexico',18,'USD',false), ('PT','Portugal',18,'EUR',false),
  ('CH','Switzerland',18,'CHF',false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO exchange_rates (base_code, quote_code, rate, valid_from) VALUES
  ('USD','EUR',0.92,'2026-01-01T00:00:00Z'), ('USD','GBP',0.79,'2026-01-01T00:00:00Z'),
  ('USD','SGD',1.34,'2026-01-01T00:00:00Z'), ('USD','JPY',149,'2026-01-01T00:00:00Z'),
  ('USD','AUD',1.52,'2026-01-01T00:00:00Z'), ('USD','AED',3.67,'2026-01-01T00:00:00Z'),
  ('USD','BRL',5.05,'2026-01-01T00:00:00Z')
ON CONFLICT (base_code, quote_code, valid_from) DO UPDATE SET rate = EXCLUDED.rate;

INSERT INTO club_plans (code, name, monthly_usd, bottle_count, description) VALUES
  ('good','Good',29,2,'Entry curation, core box'),
  ('better','Better',59,3,'Expanded selection, tasting notes'),
  ('best','Best',119,3,'Premium bottles, experiences'),
  ('icon','Icon',199,2,'Luxury allocation, exclusive events')
ON CONFLICT (code) DO UPDATE SET monthly_usd = EXCLUDED.monthly_usd, bottle_count = EXCLUDED.bottle_count;

INSERT INTO warehouses (code, name, country_code, bonded, temperature_c) VALUES
  ('CH-GVA','Bonded Geneva','CH',true,12.5),
  ('IT-ALB','Bonded Alba','IT',true,12.0),
  ('FR-PAR','Bonded Paris','FR',true,11.0),
  ('JP-TYO','Bonded Tokyo','JP',true,15.0),
  ('SG-SIN','Bonded Singapore','SG',true,15.0),
  ('DE-FRA','Bonded Frankfurt','DE',true,10.0),
  ('GB-LON','Bonded London','GB',true,14.0),
  ('MX-MEX','Bonded Mexico City','MX',true,18.0),
  ('PT-OPO','Bonded Porto','PT',true,14.0)
ON CONFLICT (code) DO NOTHING;

-- ---------- producers ----------
INSERT INTO producers (id, name, country_code, region, verified) VALUES
  ('11111111-1111-4111-8111-111111111101','Château Margaux','FR','Bordeaux',true),
  ('11111111-1111-4111-8111-111111111102','Piero Falletti','IT','Piedmont',true),
  ('11111111-1111-4111-8111-111111111103','Domaine Sévrine','FR','Burgundy',true),
  ('11111111-1111-4111-8111-111111111104','Tenuta del Vulcano','IT','Sicily',true),
  ('11111111-1111-4111-8111-111111111105','Suntory','JP','Kyoto',true),
  ('11111111-1111-4111-8111-111111111106','Maison du Clos','FR','Champagne',true),
  ('11111111-1111-4111-8111-111111111107','Weingut Rheingau','DE','Rheingau',true),
  ('11111111-1111-4111-8111-111111111108','The Macallan','GB','Speyside',true),
  ('11111111-1111-4111-8111-111111111109','Casa Agave','MX','Oaxaca',true),
  ('11111111-1111-4111-8111-11111111110A','Casa do Douro','PT','Douro',true)
ON CONFLICT (id) DO NOTHING;

-- ---------- regions ----------
INSERT INTO regions (id, name, country_code) VALUES
  ('22222222-2222-4222-8222-222222222201','Bordeaux','FR'),
  ('22222222-2222-4222-8222-222222222202','Piedmont','IT'),
  ('22222222-2222-4222-8222-222222222203','Burgundy','FR'),
  ('22222222-2222-4222-8222-222222222204','Sicily','IT'),
  ('22222222-2222-4222-8222-222222222205','Kyoto','JP'),
  ('22222222-2222-4222-8222-222222222206','Champagne','FR'),
  ('22222222-2222-4222-8222-222222222207','Rheingau','DE'),
  ('22222222-2222-4222-8222-222222222208','Speyside','GB'),
  ('22222222-2222-4222-8222-222222222209','Oaxaca','MX'),
  ('22222222-2222-4222-8222-22222222220A','Douro','PT')
ON CONFLICT (id) DO NOTHING;

-- ---------- appellations ----------
INSERT INTO appellations (id, region_id, name, classification) VALUES
  ('33333333-3333-4333-8333-333333333301','22222222-2222-4222-8222-222222222201','Margaux AOC','Grand Cru Classé'),
  ('33333333-3333-4333-8333-333333333302','22222222-2222-4222-8222-222222222202','Barolo DOCG','DOCG'),
  ('33333333-3333-4333-8333-333333333303','22222222-2222-4222-8222-222222222203','Chablis Grand Cru','Grand Cru'),
  ('33333333-3333-4333-8333-333333333304','22222222-2222-4222-8222-222222222204','Etna DOC','DOC'),
  ('33333333-3333-4333-8333-333333333305','22222222-2222-4222-8222-222222222205','Japanese Single Malt','NAS'),
  ('33333333-3333-4333-8333-333333333306','22222222-2222-4222-8222-222222222206','Champagne AOC','AOC'),
  ('33333333-3333-4333-8333-333333333307','22222222-2222-4222-8222-222222222207','Rheingau QbA','QbA'),
  ('33333333-3333-4333-8333-333333333308','22222222-2222-4222-8222-222222222208','Single Malt Scotch','NAS'),
  ('33333333-3333-4333-8333-333333333309','22222222-2222-4222-8222-222222222209','Mezcal D.O.','D.O.'),
  ('33333333-3333-4333-8333-33333333330A','22222222-2222-4222-8222-22222222220A','Porto DOC','DOC')
ON CONFLICT (id) DO NOTHING;

-- ---------- wines ----------
INSERT INTO wines (id, producer_id, appellation_id, name, type, grapes, liquid_color) VALUES
  ('44444444-4444-4444-8444-444444444401','11111111-1111-4111-8111-111111111101','33333333-3333-4333-8333-333333333301','Château Margaux','Red Wine','{Cabernet Sauvignon,Merlot,Petit Verdot}','#4a1024'),
  ('44444444-4444-4444-8444-444444444402','11111111-1111-4111-8111-111111111102','33333333-3333-4333-8333-333333333302','Barolo Cannubi','Red Wine','{Nebbiolo}','#6b2330'),
  ('44444444-4444-4444-8444-444444444403','11111111-1111-4111-8111-111111111103','33333333-3333-4333-8333-333333333303','Chablis Grand Cru Les Clos','White Wine','{Chardonnay}','#c9a94a'),
  ('44444444-4444-4444-8444-444444444404','11111111-1111-4111-8111-111111111104','33333333-3333-4333-8333-333333333304','Etna Rosso','Red Wine','{Nerello Mascalese}','#7a2a35'),
  ('44444444-4444-4444-8444-444444444405','11111111-1111-4111-8111-111111111104','33333333-3333-4333-8333-333333333304','Etna Rosso Riserva','Red Wine','{Nerello Mascalese}','#6b2230'),
  ('44444444-4444-4444-8444-444444444406','11111111-1111-4111-8111-111111111107','33333333-3333-4333-8333-333333333307','Riesling Kabinett Trocken','White Wine','{Riesling}','#d8bf5a'),
  ('44444444-4444-4444-8444-444444444407','11111111-1111-4111-8111-111111111105','33333333-3333-4333-8333-333333333305','Yamazaki 18 Year Old','Spirits','{}','#a85f22'),
  ('44444444-4444-4444-8444-444444444408','11111111-1111-4111-8111-111111111105','33333333-3333-4333-8333-333333333305','Hibiki Harmony','Spirits','{}','#c28433'),
  ('44444444-4444-4444-8444-444444444409','11111111-1111-4111-8111-111111111108','33333333-3333-4333-8333-333333333308','Macallan 12 Sherry Cask','Spirits','{}','#8f3d18'),
  ('44444444-4444-4444-8444-44444444440A','11111111-1111-4111-8111-111111111106','33333333-3333-4333-8333-333333333306','Champagne Blanc de Blancs','Sparkling','{Chardonnay}','#e0cf86'),
  ('44444444-4444-4444-8444-44444444440B','11111111-1111-4111-8111-111111111109','33333333-3333-4333-8333-333333333309','Mezcal Espadín Joven','Spirits','{}','#d7c89a'),
  ('44444444-4444-4444-8444-44444444440C','11111111-1111-4111-8111-11111111110A','33333333-3333-4333-8333-33333333330A','Vintage Port','Fortified','{Touriga Nacional,Tinta Roriz}','#5a1225')
ON CONFLICT (id) DO NOTHING;

-- ---------- vintages (null year = NAS spirits) ----------
INSERT INTO vintages (id, wine_id, year, score, tasting_notes, provenance_score, liquidity_score, custody) VALUES
  ('55555555-5555-4555-8555-555555555501','44444444-4444-4444-8444-444444444401',2016,97,'{Blackcurrant,Cedar,Violet,Graphite}',99,88,'Bonded warehouse, Geneva · 12.5°C · insured'),
  ('55555555-5555-4555-8555-555555555502','44444444-4444-4444-8444-444444444402',2018,94,'{Rose petal,Tar,Cherry,Leather}',96,74,'Bonded warehouse, Alba · 12°C · insured'),
  ('55555555-5555-4555-8555-555555555503','44444444-4444-4444-8444-444444444403',2020,93,'{Oyster shell,Lemon,Chalk,White flower}',97,71,'Bonded warehouse, Paris · 11°C · insured'),
  ('55555555-5555-4555-8555-555555555504','44444444-4444-4444-8444-444444444404',2021,92,'{Wild strawberry,Ash,Blood orange,Pepper}',95,66,'Bonded warehouse, Milan · 12°C · insured'),
  ('55555555-5555-4555-8555-555555555505','44444444-4444-4444-8444-444444444405',2019,95,'{Sour cherry,Ash,Dried herbs,Iron}',97,72,'Bonded warehouse, Milan · 12°C · insured'),
  ('55555555-5555-4555-8555-555555555506','44444444-4444-4444-8444-444444444406',2022,90,'{Lime,Green apple,Slate,Honeysuckle}',94,60,'Bonded warehouse, Frankfurt · 10°C · insured'),
  ('55555555-5555-4555-8555-555555555507','44444444-4444-4444-8444-444444444407',null,98,'{Mizunara oak,Dried fig,Incense,Toffee}',99,93,'Bonded warehouse, Tokyo · 15°C · insured'),
  ('55555555-5555-4555-8555-555555555508','44444444-4444-4444-8444-444444444408',null,96,'{Honey,Orange blossom,Sandalwood,Mizunara}',97,85,'Bonded warehouse, Singapore · 15°C · insured'),
  ('55555555-5555-4555-8555-555555555509','44444444-4444-4444-8444-444444444409',null,94,'{Dried raisin,Orange peel,Walnut,Cocoa}',98,88,'Bonded warehouse, London · 14°C · insured'),
  ('55555555-5555-4555-8555-55555555550A','44444444-4444-4444-8444-44444444440A',2016,96,'{Brioche,Lemon zest,Chalk,Almond}',98,79,'Bonded warehouse, Reims · 11°C · insured'),
  ('55555555-5555-4555-8555-55555555550B','44444444-4444-4444-8444-44444444440B',null,92,'{Smoke,Green chilli,Lime,Roast agave}',93,64,'Bonded warehouse, Mexico City · 18°C · insured'),
  ('55555555-5555-4555-8555-55555555550C','44444444-4444-4444-8444-44444444440C',2017,94,'{Blackberry,Plum,Cocoa,Violet}',96,70,'Bonded warehouse, Porto · 14°C · insured')
ON CONFLICT (id) DO NOTHING;

-- ---------- SKUs ----------
INSERT INTO skus (id, vintage_id, sku, price_usd) VALUES
  ('66666666-6666-4666-8666-666666666601','55555555-5555-4555-8555-555555555501','sku-1001',1290),
  ('66666666-6666-4666-8666-666666666602','55555555-5555-4555-8555-555555555502','sku-1002',168),
  ('66666666-6666-4666-8666-666666666603','55555555-5555-4555-8555-555555555503','sku-1003',142),
  ('66666666-6666-4666-8666-666666666604','55555555-5555-4555-8555-555555555504','sku-1004',44),
  ('66666666-6666-4666-8666-666666666605','55555555-5555-4555-8555-555555555506','sku-1005',32),
  ('66666666-6666-4666-8666-666666666606','55555555-5555-4555-8555-555555555505','sku-1006',92),
  ('66666666-6666-4666-8666-666666666607','55555555-5555-4555-8555-555555555507','sku-1007',780),
  ('66666666-6666-4666-8666-666666666608','55555555-5555-4555-8555-555555555508','sku-1008',78),
  ('66666666-6666-4666-8666-666666666609','55555555-5555-4555-8555-555555555509','sku-1009',96),
  ('66666666-6666-4666-8666-66666666660A','55555555-5555-4555-8555-55555555550A','sku-1010',118),
  ('66666666-6666-4666-8666-66666666660B','55555555-5555-4555-8555-55555555550B','sku-1011',62),
  ('66666666-6666-4666-8666-66666666660C','55555555-5555-4555-8555-55555555550C','sku-1012',88)
ON CONFLICT (id) DO NOTHING;

-- Product identity rows used by membership/allocation foreign keys.
INSERT INTO products (id, sku, name)
SELECT s.id, s.sku, w.name
FROM skus s
JOIN vintages v ON v.id = s.vintage_id
JOIN wines w ON w.id = v.wine_id
ON CONFLICT (id) DO UPDATE SET sku = EXCLUDED.sku, name = EXCLUDED.name, active = true;

-- Platform-owned stock rows have no seller; clear them first so the composite
-- unique constraint (which treats NULLs as distinct) still behaves idempotently.
DELETE FROM inventory_items WHERE seller_id IS NULL;

INSERT INTO inventory_items (sku_id, warehouse_id, quantity_on_hand)
SELECT v.sku_id, w.id, v.quantity_on_hand
FROM (VALUES
  ('66666666-6666-4666-8666-666666666601'::uuid,'CH-GVA',12),
  ('66666666-6666-4666-8666-666666666602'::uuid,'IT-ALB',34),
  ('66666666-6666-4666-8666-666666666603'::uuid,'FR-PAR',21),
  ('66666666-6666-4666-8666-666666666604'::uuid,'IT-ALB',76),
  ('66666666-6666-4666-8666-666666666605'::uuid,'IT-ALB',18),
  ('66666666-6666-4666-8666-666666666606'::uuid,'DE-FRA',120),
  ('66666666-6666-4666-8666-666666666607'::uuid,'JP-TYO',8),
  ('66666666-6666-4666-8666-666666666608'::uuid,'SG-SIN',210),
  ('66666666-6666-4666-8666-666666666609'::uuid,'GB-LON',132),
  ('66666666-6666-4666-8666-66666666660A'::uuid,'FR-PAR',64),
  ('66666666-6666-4666-8666-66666666660B'::uuid,'MX-MEX',88),
  ('66666666-6666-4666-8666-66666666660C'::uuid,'PT-OPO',42)
) AS v(sku_id, warehouse_code, quantity_on_hand)
JOIN warehouses w ON w.code = v.warehouse_code
ON CONFLICT (sku_id, warehouse_id, seller_id) DO UPDATE SET quantity_on_hand = EXCLUDED.quantity_on_hand;

COMMIT;
