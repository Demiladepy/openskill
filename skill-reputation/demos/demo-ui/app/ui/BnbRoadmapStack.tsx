"use client";

type Layer = {
  id: string;
  standard: string;
  status: string;
  description: string;
  verify?: string;
  link?: string | null;
  ok?: boolean;
};

type RoadmapData = {
  framework?: string;
  layers?: Layer[];
  agentEndpoint?: string | null;
  agentFallback?: string | null;
  scanUrl?: string | null;
};

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  demo: "Demo",
  roadmap: "Roadmap",
};

export function BnbRoadmapStack({ data }: { data?: RoadmapData | null }) {
  const layers = data?.layers ?? [];

  if (!layers.length) {
    return (
      <p className="muted">
        BAP-692 layer status loads from <code>/api/integrations/status</code>.
      </p>
    );
  }

  return (
    <div className="roadmapStack">
      <div className="roadmapHeader">
        <p className="roadmapFramework">{data?.framework ?? "BAP-692"} · BNB Agent Stack</p>
        {data?.agentEndpoint && (
          <p className="roadmapEndpoint muted">
            Primary endpoint:{" "}
            <a href={data.agentEndpoint} target="_blank" rel="noreferrer">
              {data.agentEndpoint}
            </a>
          </p>
        )}
        {data?.agentFallback && (
          <p className="roadmapEndpoint muted">
            Fallback (local): <code>{data.agentFallback}</code>
          </p>
        )}
        {data?.scanUrl && (
          <a href={data.scanUrl} target="_blank" rel="noreferrer" className="integrationLink">
            View on 8004scan →
          </a>
        )}
      </div>

      <div className="roadmapGrid">
        {layers.map((layer) => (
          <article key={layer.id} className={`roadmapCard roadmap-${layer.status}`}>
            <div className="roadmapCardTop">
              <span className="roadmapLayerId">{layer.id}</span>
              <span className={`roadmapStatus roadmapStatus-${layer.status}`}>
                {STATUS_LABEL[layer.status] ?? layer.status}
              </span>
            </div>
            <h4 className="roadmapStandard">{layer.standard}</h4>
            <p className="roadmapDesc">{layer.description}</p>
            {layer.verify && (
              <p className="roadmapVerify muted">
                Verify: <code>{layer.verify}</code>
              </p>
            )}
            {layer.link && (
              <a href={layer.link} target="_blank" rel="noreferrer" className="integrationLink">
                Open →
              </a>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
