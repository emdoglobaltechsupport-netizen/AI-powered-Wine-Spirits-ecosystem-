import { CANON, SAFETY_NOTE } from '@vintora/shared';

const moduleDescriptions: Record<string, string> = {
  'Vintora Market': 'Age-gated B2C marketplace with a 10M+ SKU long-term target',
  'Vintora Trade': 'Wholesale procurement, RFQs and contracts',
  'Vintora Sommelier': 'Conversational pairing and education agent',
  'Vintora Assist': 'Cross-module shopping concierge',
  'Vintora Studio': 'Generative marketing for brands and sellers',
  'Vintora Seller': 'Merchant operating system',
  'Vintora Flow': 'Temperature-controlled global logistics',
  'Vintora Club': 'Curated monthly subscription boxes',
  'Vintora Vault': 'Fine-wine investment and secondary market',
  'Vintora Rewards': 'Unified loyalty, tiers and experiences',
};

export default function HomePage() {
  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="mark">V</span> VINTORA</div>
        <nav>
          <a href="#modules">Platform</a><a href="#trajectory">Trajectory</a><a href="#prototype">Prototype</a>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">AI-NATIVE WINE &amp; SPIRITS ECOSYSTEM</p>
        <h1>{CANON.tagline}</h1>
        <p className="lede">
          Ten modules. One closed loop: taste profile → discovery → purchase → consumption → review → a better profile.
          Built for {CANON.scale.users2034.toLocaleString()} users, {CANON.scale.countries}+ countries and {CANON.scale.peakOrdersPerDay.toLocaleString()} orders per day at peak.
        </p>
        <div className="actions">
          <a className="btn primary" href="http://localhost:8123/">Open interactive prototype</a>
          <span className="btn">Blueprint: vintora/README.md</span>
        </div>
      </section>

      <section id="modules" className="section">
        <h2>The ten modules</h2>
        <div className="grid">
          {CANON.modules.map((name, i) => (
            <article className="card" key={name}>
              <span className="index">{String(i + 1).padStart(2, '0')}</span>
              <h3>{name}</h3>
              <p>{moduleDescriptions[name]}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="trajectory" className="section">
        <h2>Modeled trajectory</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Year</th><th>Users</th><th>GMV</th><th>Net revenue</th><th>Take rate</th></tr></thead>
            <tbody>
              {Object.entries(CANON.revenue).map(([year, v]) => (
                <tr key={year}>
                  <td>{year.replace('y', '20')}</td>
                  <td>{(v.users / 1_000_000).toFixed(0)}M</td>
                  <td>${(v.gmvUsd / 1_000_000_000).toFixed(2)}B</td>
                  <td>${(v.netRevenueUsd / 1_000_000).toFixed(0)}M</td>
                  <td>{(v.takeRate * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="fine">All figures are modeled targets, not reported results.</p>
      </section>

      <section id="prototype" className="section callout">
        <h2>Start with the prototype</h2>
        <p>
          The zero-install browser prototype in <code>apps/prototype</code> implements the age gate, Market storefront,
          Sommelier conversation, multi-currency checkout, Club, Vault, Trade, Seller, Rewards and Studio — no dependencies, no build step.
        </p>
        <pre>powershell -ExecutionPolicy Bypass -File .\apps\prototype\serve.ps1</pre>
      </section>

      <footer>{SAFETY_NOTE} · © {CANON.founded} Vintora. Blueprint documentation in <code>vintora/*.md</code>.</footer>
    </main>
  );
}
