import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import type { SessionSummary } from "../types/session";
import { Link } from "@/ui";
import { TbReload, TbDotsVertical } from 'solid-icons/tb'
import Dropdown, { DropdownItem } from "@/ui/Dropdown";

interface ConversationsListProps {
  projectPath: string;
  onSelect: (session: SessionSummary | null) => void;
}

const ConversationsList = (props: ConversationsListProps) => {
  const [sessions, setSessions] = createSignal<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [editingSessionId, setEditingSessionId] = createSignal<string | null>(null);
  let dropdownRef: { close: () => void } | undefined;

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(props.projectPath)
      const response = await invoke<{ sessions: SessionSummary[] }>("get_project_sessions", {projectPath: props.projectPath});
      console.log(response)
      const sessionList: SessionSummary[] = response.sessions;
      
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
    return sessions().filter((s) =>
      s.text.toLowerCase().includes(query) || s.session_id.toLowerCase().includes(query)
    );
  });

  const hasSessions = createMemo(() => visibleSessions().length > 0);

  const handleSelect = (summary: SessionSummary | null) => {
    console.log(summary)
    const nextKey = summary?.session_id ?? null;
    setSelectedKey(nextKey);

    props.onSelect(summary);
  };

  const handleDelete = async (sessionToDelete: SessionSummary) => {
    try {
      await invoke("delete_session_file", {
        projectPath: props.projectPath,
        sessionPath: sessionToDelete.path,
      });
      setSessions(sessions().filter(s => s.session_id !== sessionToDelete.session_id));
      if (selectedKey() === sessionToDelete.session_id) {
        handleSelect(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <aside class="flex h-screen w-64 flex-col rounded-2xl border border-slate-700/40 bg-slate-950/60 py-5 shadow-lg shadow-slate-950/40">
      <div class="mb-4 flex items-center justify-between px-2">
        <Link href="/" variant="ghost">
          <span>Projects</span>
        </Link>
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
          onclick={() => void fetchSessions()}
          disabled={isLoading()}
        >
          {isLoading() ? "Loading…" : <TbReload size={18} />}
        </button>
      </div>
      <input
        type="search"
        value={searchQuery()}
        onInput={(event) => setSearchQuery(event.currentTarget.value)}
        placeholder="Search"
        class="mb-4 h-8 w-full rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
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
                const isActive = selectedKey() === session.session_id;
  const handleRename = async (session: SessionSummary, newTitle: string) => {
    if (newTitle.trim().length === 0) {
      setEditingSessionId(null);
      return;
    }
    try {
      await invoke("update_cache_title", {
        projectPath: props.projectPath,
        sessionPath: session.path,
        newText: newTitle.trim(),
      });
      setSessions(
        sessions().map((s) =>
          s.session_id === session.session_id
            ? { ...s, text: newTitle.trim() }
            : s
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditingSessionId(null);
    }
  };

  return (
                  <div
                    class={`group relative flex w-full items-center justify-between px-3 py-0.5 text-left transition ${
                      isActive
                        ? "border-indigo-500/60 bg-indigo-600/20 text-indigo-100"
                        : "border-slate-800/40 bg-slate-900/40 text-slate-300 hover:border-slate-700/60 hover:bg-slate-900/70"
                    }`}
                  >
                    <Show
                      when={editingSessionId() === session.session_id}
                      fallback={
                        <button
                          type="button"
                          class="flex-1 text-left"
                          onClick={() => handleSelect(session)}
                        >
                          <span class="text-sm font-medium text-slate-100 group-hover:text-slate-50">
                            {session.text && session.text.length > 0 ? session.text : session.session_id}
                          </span>
                        </button>
                      }
                    >
                      <input
                        type="text"
                        value={session.text || session.session_id}
                        onBlur={(e) => handleRename(session, e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        class="flex-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        autofocus
                      />
                    </Show>
                    <div class="absolute right-2 top-1/2 -translate-y-1/2 z-20 opacity-100 group-hover:opacity-100">
                      <Dropdown
                        ref={(dropdown) => (dropdownRef = dropdown)}
                        trigger={(triggerProps) => (
                          <button
                            {...triggerProps}
                            type="button"
                            class="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-600"
                          >
                            <TbDotsVertical size={16} />
                          </button>
                        )}
                      >
                        <DropdownItem onClick={() => void handleDelete(session)}>
                          <span class="z-50">Delete</span>
                        </DropdownItem>
                        <DropdownItem onClick={() => {
                          setEditingSessionId(session.session_id);
                          dropdownRef?.close();
                          // Delay selection to allow input to render and focus
                          setTimeout(() => {
                            const input = document.querySelector<HTMLInputElement>("input[autofocus]");
                            if (input) {
                              input.select();
                            }
                          }, 0);
                        }}>
                          <span class="z-50">Rename</span>
                        </DropdownItem>
                      </Dropdown>
                    </div>
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
