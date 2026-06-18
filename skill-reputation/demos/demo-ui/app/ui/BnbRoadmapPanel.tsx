"use client";

import { useEffect, useState } from "react";
import { BnbRoadmapStack } from "./BnbRoadmapStack";

type ApiResponse = {
  bap692?: {
    framework?: string;
    layers?: Array<{
      id: string;
      standard: string;
      status: string;
      description: string;
      verify?: string;
      link?: string | null;
    }>;
    agentEndpoint?: string | null;
    agentFallback?: string | null;
    scanUrl?: string | null;
  };
};

export function BnbRoadmapPanel() {
  const [data, setData] = useState<ApiResponse["bap692"] | null>(null);

  useEffect(() => {
    fetch("/api/integrations/status")
      .then((r) => r.json())
      .then((d: ApiResponse) => setData(d.bap692 ?? null))
      .catch(() => setData(null));
  }, []);

  return (
    <section className="roadmapPanel">
      <h3 className="integrationTitle">BAP-692 agent stack</h3>
      <p className="muted integrationSub">
        How Forge Skills maps onto BNB Chain&apos;s four-layer roadmap — identity, commerce, payments, memory.
      </p>
      <BnbRoadmapStack data={data} />
    </section>
  );
}
