import { createSignal } from "solid-js";
import ConversationsList from "./components/ConversationsList";
import SessionView from "./components/SessionView";
import type { SessionSummary } from "./types/session";
import "./App.css";

const DEFAULT_SESSION_FILEPATH = ".codex/sessions/2025/10/04/rollout-2025-10-04T06-19-17-0199aebb-a856-7d43-ae8c-d9f86c60a62c.jsonl";

function App() {
  const [activeSummary, setActiveSummary] = createSignal<SessionSummary | null>(null);

  const handleSelectSession = (summary: SessionSummary | null) => {
    setActiveSummary(summary);
  };

  return (
    <main class="min-h-screen bg-slate-950 font-sans text-slate-100">
      <div class="mx-auto flex">
        <ConversationsList
          defaultSessionPath={DEFAULT_SESSION_FILEPATH}
          onSelect={handleSelectSession}
        />

        <SessionView summary={activeSummary()} />
      </div>
    </main>
  );
}

export default App;
