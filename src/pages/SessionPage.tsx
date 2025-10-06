import { createSignal } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import ConversationsList from "../components/ConversationsList";
import SessionView from "../components/SessionView";
import type { SessionSummary } from "../types/session";
import "../App.css";

export default function SessionPage() {
  const [activeSummary, setActiveSummary] = createSignal<SessionSummary | null>(null);
  const [params] = useSearchParams();
  const projectPath = () => Array.isArray(params.project) ? params.project[0] ?? "" : (params.project ?? "");

  const handleSelectSession = (summary: SessionSummary | null) => {
    setActiveSummary(summary);
  };

  return (
    <div class="flex">
      <ConversationsList
        projectPath={projectPath()}
        onSelect={handleSelectSession}
      />

      <SessionView summary={activeSummary()} />
    </div>
  );
}