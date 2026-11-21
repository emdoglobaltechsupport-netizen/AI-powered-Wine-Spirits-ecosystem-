# Vintora Asset Submission and Provenance Terms

> **Prototype mode — no real orders are placed. NO-GO for public launch.** Machine authority: [`config/repository-policy.json`](./config/repository-policy.json); checked by `npm run policy:check`.

## 1. Scope

This policy covers images, icons, fonts, audio, video, copy, datasets, fixtures, model prompts/templates, evaluation sets and any other material submitted to this repository. Source code is covered by [`CONTRIBUTING.md`](./CONTRIBUTING.md) and [`LICENSE`](./LICENSE).

## 2. Required record for every asset

Each submission must state, in the PR or a bundled `PROVENANCE.md`:

- file path and a short description;
- author or rights holder;
- source URL or internal origin;
- licence or written permission, with an SPDX identifier where applicable;
- date obtained or created and the reviewer role;
- permitted use (demo UI, documentation, test fixture, generated draft, etc.);
- whether AI tooling was used, and a note that a human reviewed the output.

Absence of a record is a rejection reason. "Found online" is not provenance. A generated file is not evidence of rights to the underlying style, brand or data.

## 3. Prohibited in this prototype

- Personal data, government IDs, real customer records or session artefacts.
- Licensed supplier catalogues, verified stock feeds, real invoice data or rights-restricted producer imagery.
- Third-party trademarks, trade dress, producer labels or brand assets without written permission.
- Alcohol-health, investment-performance or intoxication claims presented as verified facts.
- Assets implying a real order, real settlement, licensed custody, regulator approval or a live provider integration.
- Artwork or copy that bypasses the responsible-drinking or age-gating controls.

## 4. Demo and AI-generated assets

Fictional demo rows, illustrative ratings/prices and deterministic copy are allowed only when labelled as demo or simulated. AI-generated copy is draft-only: it needs a human reviewer, prompt/model provenance where the output is retained, and legal/compliance review before any regulated claim. No model output may create a purchase, publish a campaign or move funds in this build.

## 5. Removal and takedown

A rights holder or maintainer may request removal of an asset. The repository owner will disable the asset, preserve the provenance record, review the evidence and apply a corrected or removed version. No public accusation or personal data is published in the takedown record. No takedown or provenance review has been attached to this workspace; this is a defined process, not an attestation.
