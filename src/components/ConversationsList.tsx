import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { ConversationSummary } from "@/types/session";
import { Link } from "@/ui";
import { TbReload } from "solid-icons/tb";

import { useSessionActions } from "@/hooks/useSessionActions";
import SessionDropdown from "./SessionDropdown";

interface ConversationsListProps {
  projectPath: string;
  onSelect: (session: ConversationSummary | null) => void;
}

const ConversationsList = (props: ConversationsListProps) => {
  const [sessions, setSessions] = createSignal<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedSessionIds, setSelectedSessionIds] = createSignal<Set<string>>(new Set());
  const [isBatchDeleteMode, setIsBatchDeleteMode] = createSignal(false);

  const {
    handleRename,
    handleBatchDelete,
    editingSessionId,
    setEditingSessionId,
    error,
    setError,
  } = useSessionActions({
    projectPath: props.projectPath,
    setSessions,
    sessions,
    setSelectedKey,
    selectedKey,
    onSelect: props.onSelect,
    setSelectedSessionIds,
    selectedSessionIds,
  });
  
  const reloadSessions = async() => {
    try {
      await invoke("delete_cache_file", { projectPath: props.projectPath });
    } catch (err) {
      console.log(err)
    }
    await fetchSessions()
  }

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log(props.projectPath);
      const response = await invoke<{ sessions: ConversationSummary[] }>(
        "get_project_sessions",
        { projectPath: props.projectPath },
      );
      console.log(response);
      const sessionList: ConversationSummary[] = response.sessions;

      setSessions(sessionList);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    void fetchSessions();
  });

  const visibleSessions = createMemo(() => {
    const query = searchQuery().toLowerCase().trim();
    if (!query) return sessions();
    return sessions().filter(
      (s) =>
        s.preview.toLowerCase().includes(query) ||
        s.conversationId.toLowerCase().includes(query),
    );
  });

  const hasSessions = createMemo(() => visibleSessions().length > 0);

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessionIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sessionId)) {
        newSet.delete(sessionId);
      } else {
        newSet.add(sessionId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSessionIds().size === visibleSessions().length) {
      setSelectedSessionIds(new Set<string>());
    } else {
      setSelectedSessionIds(new Set<string>(visibleSessions().map(s => s.conversationId)));
    }
  };

  const clearSelection = () => {
    setSelectedSessionIds(new Set<string>());
    setIsBatchDeleteMode(false);
  };

  const handleSelect = (summary: ConversationSummary | null) => {
    if (isBatchDeleteMode()) {
      // If in selection mode, don't change the active session
      return;
    }
    console.log(summary);
    const nextKey = summary?.conversationId ?? null;
    setSelectedKey(nextKey);

    props.onSelect(summary);
  };

  return (
    <aside class="flex h-screen w-96 flex-col rounded-2xl border border-slate-700/40 bg-slate-950/60 py-5 shadow-lg shadow-slate-950/40">
      <div class="mb-4 flex items-center justify-between px-2">
        <Link href="/" variant="ghost">
          <span>Projects</span>
        </Link>
        <div class="flex items-center gap-2">
          <Show when={isBatchDeleteMode() && selectedSessionIds().size > 0}>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-red-700 bg-red-900 px-2 py-1 text-xs font-medium text-red-300 transition hover:border-red-600 hover:bg-red-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:cursor-progress disabled:opacity-60"
              onclick={() => void handleBatchDelete(Array.from(selectedSessionIds()))}
              disabled={isLoading()}
            >
              Delete Selected ({selectedSessionIds().size})
            </button>
          </Show>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
            onclick={() => void reloadSessions()}
            disabled={isLoading()}
          >
            {isLoading() ? "Loading…" : <TbReload size={18} />}
          </button>
        </div>
      </div>
      <input
        type="search"
        value={searchQuery()}
        onInput={(event) => setSearchQuery(event.currentTarget.value)}
        placeholder="Search"
        class="mb-4 h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
      <div class="mb-4 flex items-center justify-between px-2">
        <Show when={!isBatchDeleteMode()}>
          <button
            type="button"
            class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
            onclick={() => setIsBatchDeleteMode(true)}
          >
            Select Sessions
          </button>
        </Show>
        <Show when={isBatchDeleteMode()}>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
              onclick={toggleSelectAll}
            >
              {selectedSessionIds().size === visibleSessions().length ? "Deselect All" : "Select All"}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
              onclick={clearSelection}
            >
              Cancel
            </button>
          </div>
        </Show>
      </div>
      <Show when={error()}>
        {(message) => (
          <p class="mb-3 rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
            {message()}
          </p>
        )}
      </Show>
      <div class="flex-1 overflow-hidden">
        <Show
          when={hasSessions()}
          fallback={
            <p class="text-xs text-slate-500">
              {isLoading()
                ? "Scanning conversations…"
                : sessions().length === 0
                  ? "No sessions found." 
                  : "No matching sessions."}
            </p>
          }
        >
          <ul class="flex h-full flex-col gap-2 overflow-y-auto pr-1">
            <For each={visibleSessions()}>
              {(session) => {
                const isActive = selectedKey() === session.conversationId;
                const isSelected = selectedSessionIds().has(session.conversationId);

                return (
                  <div
                    class={`group relative flex w-full items-center justify-between px-3 py-0.5 text-left transition ${
                      isActive
                        ? "border-indigo-500/60 bg-indigo-600/20 text-indigo-100"
                        : "border-slate-800/40 bg-slate-900/40 text-slate-300 hover:border-slate-700/60 hover:bg-slate-900/70"
                    }`}
                  >
                    <Show when={isBatchDeleteMode()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSessionSelection(session.conversationId)}
                        class="mr-2"
                        onClick={(e) => e.stopPropagation()} // Prevent triggering handleSelect
                      />
                    </Show>
                    <Show
                      when={editingSessionId() === session.conversationId}
                      fallback={
                        <button
                          type="button"
                          class="flex-1 text-left"
                          onClick={() => handleSelect(session)}
                        >
                          <span class="text-sm font-medium text-slate-100 group-hover:text-slate-50">
                            {session.preview && session.preview.length > 0
                              ? session.preview
                              : session.conversationId}
                          </span>
                        </button>
                      }
                    >
                      <input
                        type="text"
                        value={session.preview || session.conversationId}
                        onBlur={(e) =>
                          handleRename(session, e.currentTarget.value)
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        class="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autofocus
                      />
                    </Show>
                    <SessionDropdown
                      session={session}
                      projectPath={props.projectPath}
                      setSessions={setSessions}
                      sessions={sessions}
                      setSelectedKey={setSelectedKey}
                      selectedKey={selectedKey}
                      onSelect={props.onSelect}
                      handleRename={handleRename}
                      setEditingSessionId={setEditingSessionId}
                      selectedSessionIds={selectedSessionIds}
                      setSelectedSessionIds={setSelectedSessionIds}
                    />
                  </div>
                );
              }}
            </For>
          </ul>
        </Show>
      </div>
    </aside>
  );
};

export default ConversationsList;
