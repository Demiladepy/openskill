"use client";

import { SKILL_CATALOG } from "../lib/skillCatalog";

function SkillIcon({ accent }: { accent: string }) {
  const letter = accent === "momentum" ? "M" : accent === "sentiment" ? "S" : "R";
  return (
    <span className={`skillCatalogIcon skillCatalogIcon-${accent}`} aria-hidden>
      {letter}
    </span>
  );
}

export function SimulationOnlyCallout() {
  return (
    <aside className="simulationCallout" role="note">
      <div className="simulationCalloutHead">
        <span className="simulationBadge">Simulation only</span>
        <strong>What this means</strong>
      </div>
      <p>
        This is a <strong>Track 2 hackathon rule</strong>, not a missing BNB integration. Strategy Skills are
        backtestable research packages — judges expect JSON metrics and equity curves, not live exchange orders.
      </p>
      <ul className="simulationCalloutList">
        <li>
          <strong>Yes:</strong> historical backtests, CMC signals, skill zips, optional BSC testnet attestation
          + ERC-8004 agent identity
        </li>
        <li>
          <strong>No:</strong> placing real trades, wallet swaps, or autonomous fund movement
        </li>
      </ul>
    </aside>
  );
}

export function SkillCatalogCards({ showHighlights = true }: { showHighlights?: boolean }) {
  return (
    <div className="skillCatalog">
      <div className="skillCatalogRoot">
        <span className="skillCatalogRootIcon" aria-hidden>
          📁
        </span>
        <div>
          <p className="skillCatalogRootLabel">skills/</p>
          <p className="skillCatalogRootSub muted">Official CoinMarketCap Agent Hub format · one SKILL.md per strategy</p>
        </div>
      </div>

      <div className="skillCatalogGrid">
        {SKILL_CATALOG.map((skill) => (
          <article key={skill.id} className={`skillCatalogCard skillCatalogCard-${skill.accent}`}>
            <header className="skillCatalogCardHead">
              <SkillIcon accent={skill.accent} />
              <div className="skillCatalogCardTitles">
                <h3>{skill.title}</h3>
                <p className="skillCatalogTagline">{skill.tagline}</p>
              </div>
            </header>

            <p className="skillCatalogDesc">{skill.description}</p>

            <div className="skillCatalogSignals">
              {skill.signals.map((s) => (
                <span key={s} className="skillCatalogSignal">
                  {s}
                </span>
              ))}
            </div>

            {showHighlights && skill.bestSharpe && (
              <div className="skillCatalogHighlight">
                <span className="skillCatalogHighlightLabel">{skill.highlight}</span>
                <span className="skillCatalogSharpe">
                  Sharpe {skill.bestSharpe.value} · {skill.bestSharpe.asset}
                </span>
              </div>
            )}

            <footer className="skillCatalogFoot">
              <code className="skillCatalogPath">{skill.folder}SKILL.md</code>
              <div className="skillCatalogTags">
                {skill.tags.map((t) => (
                  <span key={t} className="skillCatalogTag">
                    {t}
                  </span>
                ))}
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}
