import type { DashboardOverview } from "../../../lib/api";
import { AgendaSection } from "./AgendaSection";
import { AttentionPanel } from "./AttentionPanel";
import "./AgendaAndAttentionSection.css";

interface Props {
  overview: DashboardOverview;
}

export function AgendaAndAttentionSection({ overview }: Props) {
  return (
    <div className="agenda-attention-grid">
      <AgendaSection overview={overview} />
      <AttentionPanel overview={overview} />
    </div>
  );
}
