import { INSIGHT_QUERY_SPECS } from './insight-queries';

describe('Insight fixed query boundary', () => {
  it('exposes only parameterised aggregate SQL with no PHI or raw identifier output', () => {
    const specs = Object.values(INSIGHT_QUERY_SPECS);
    expect(specs.length).toBeGreaterThan(0);
    const sql = specs.map((spec) => spec.sql).join('\n').toUpperCase();
    const forbidden = [
      'CLINICAL_RECORDS',
      'CONSENT_GRANTS',
      'PROVIDER_CREDENTIALS',
      'CIPHERTEXT',
      'AUTH_TAG',
      'INTEGRITY_HASH',
      'EMAIL_HASH',
      'PHONE_HASH',
      'LICENCE_HASH',
      'REFERENCE_HASH',
      'DECRYPT',
    ];
    for (const token of forbidden) expect(sql).not.toContain(token);
    for (const spec of specs) {
      expect(spec.sql).toContain('$1');
      expect(spec.sql).toContain('count(');
      expect(spec.sql).not.toMatch(/;\s*\w/);
    }
  });

  it('maps only aggregate dimensions, never row identifiers', () => {
    for (const spec of Object.values(INSIGHT_QUERY_SPECS)) {
      for (const dimension of spec.dimensions) {
        expect(['period', 'agentId', 'capability', 'outcome']).toContain(dimension.key);
      }
    }
  });
});
