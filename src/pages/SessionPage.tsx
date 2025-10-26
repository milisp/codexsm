import { createSignal } from "solid-js";
import { useSearchParams } from "@solidjs/router";
import ConversationsList from "@/components/ConversationsList";
import SessionView from "@/components/SessionView";
import type { ConversationSummary } from "@/types/session";

export default function SessionPage() {
  const [activeSummary, setActiveSummary] = createSignal<ConversationSummary | null>(null);
  const [params] = useSearchParams();
  console.log(params)
  const projectPath = () => Array.isArray(params.project) ? params.project[0] ?? "" : (params.project ?? "");

  const handleSelectSession = (summary: ConversationSummary | null) => {
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