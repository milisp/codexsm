import { For, Show, createMemo, createSignal, onMount } from "solid-js";
import { readDir, BaseDirectory } from "@tauri-apps/plugin-fs";
import type { SessionSummary } from "../types/session";

interface ConversationsListProps {
  defaultSessionPath: string;
  onSelect: (session: SessionSummary | null) => void;
}

const normalizeSessionPath = (value: string) => {
  if (!value) return value;
  const normalized = value.replace(/\\/g, "/");
  const pivot = normalized.indexOf(".codex/");
  return pivot !== -1 ? normalized.slice(pivot) : normalized;
};

const createSessionKey = (baseDir: BaseDirectory, path: string) => `${baseDir}:${path}`;

const joinRelativePath = (parent: string, segment: string) => {
  if (!parent) return segment;
  return `${parent.replace(/\/+$/, "")}/${segment}`;
};

const deriveFolderLabel = (path: string) => {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/");
  if (segments.length < 2) return "sessions";

  const withoutFile = segments.slice(0, -1);
  if (withoutFile.length === 0) return "sessions";

  if (withoutFile[0] === ".codex" && withoutFile[1] === "sessions") {
    return withoutFile.slice(2).join(" / ") || "sessions";
  }

  if (withoutFile[0] === "sessions") {
    return withoutFile.slice(1).join(" / ") || "sessions";
  }

  return withoutFile.join(" / ") || "sessions";
};

const extractDisplayName = (fileName: string) => {
  const uuidMatch = fileName.match(/([0-9a-zA-Z-]{20,})\.jsonl$/);
  if (uuidMatch) return uuidMatch[1];
  return fileName.replace(/\.jsonl$/i, "");
};

const ConversationsList = (props: ConversationsListProps) => {
  const [sessions, setSessions] = createSignal<SessionSummary[]>([]);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [selectedKey, setSelectedKey] = createSignal<string | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");

  const visibleSessions = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    if (!query) return sessions();

    return sessions().filter((entry) => {
      const display = entry.displayName.toLowerCase();
      const folder = entry.folder.toLowerCase();
      return display.includes(query) || folder.includes(query);
    });
  });

  const hasSessions = createMemo(() => visibleSessions().length > 0);

  const handleSelect = (summary: SessionSummary | null) => {
    const nextKey = summary?.key ?? null;
    setSelectedKey(nextKey);

    props.onSelect(summary);
  };

  const fetchSessions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const collected: SessionSummary[] = [];
      const seen = new Set<string>();
      let foundAny = false;

      const ROOT_CANDIDATES: Array<{ baseDir: BaseDirectory; path: string }> = [
        { baseDir: BaseDirectory.Home, path: ".codex/sessions" },
      ];

      const discover = async (dir: string, baseDir: BaseDirectory) => {
        const entries = await readDir(dir, { baseDir });

        for (const entry of entries) {
          const entryPath = joinRelativePath(dir, entry.name);

          if (entry.isDirectory) {
            try {
              await discover(entryPath, baseDir);
            } catch (nestedError) {
              console.warn("Unable to read nested directory", entryPath, nestedError);
            }
            continue;
          }

          if (entry.isFile && entry.name.endsWith(".jsonl")) {
            const normalizedPath = normalizeSessionPath(entryPath);
            const key = createSessionKey(baseDir, normalizedPath);
            if (seen.has(key)) continue;
            seen.add(key);
            collected.push({
              key,
              path: normalizedPath,
              displayName: extractDisplayName(entry.name),
              folder: deriveFolderLabel(normalizedPath),
              baseDir,
            });
          }
        }
      };

      for (const root of ROOT_CANDIDATES) {
        try {
          await discover(root.path, root.baseDir);
          foundAny = true;
        } catch (rootError) {
          console.warn("Unable to read sessions root", root, rootError);
        }
      }

      if (!foundAny) {
        setSessions([]);
        handleSelect(null);
        setError("Unable to read the conversations directory.");
        return;
      }

      collected.sort((a, b) => b.path.localeCompare(a.path));

      setSessions(collected);

      if (collected.length === 0) {
        handleSelect(null);
        return;
      }

      const currentKey = selectedKey();
      let fallback = currentKey ? collected.find((item) => item.key === currentKey) ?? null : null;

      if (!fallback) {
        fallback =
          collected.find((item) => item.path === props.defaultSessionPath) ??
          collected[0];
      }

      handleSelect(fallback ?? null);
    } catch (fsError) {
      console.error("Failed to load sessions list", fsError);
      setSessions([]);
      handleSelect(null);
      setError("Unable to read the conversations directory.");
    } finally {
      setIsLoading(false);
    }
  };

  onMount(() => {
    void fetchSessions();
  });

  return (
    <aside class="flex h-screen w-64 flex-col rounded-2xl border border-slate-700/40 bg-slate-950/60 py-5 shadow-lg shadow-slate-950/40">
      <div class="mb-4 flex items-center gap-2">
        <input
          type="search"
          value={searchQuery()}
          onInput={(event) => setSearchQuery(event.currentTarget.value)}
          placeholder="Search conversations…"
          class="h-8 w-full flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          type="button"
          class="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-progress disabled:opacity-60"
          onclick={() => void fetchSessions()}
          disabled={isLoading()}
        >
          {isLoading() ? "Loading…" : "Reload"}
        </button>
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
                const isActive = selectedKey() === session.key;
                return (
                  <button
                    type="button"
                    class={`group flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? "border-indigo-500/60 bg-indigo-600/20 text-indigo-100"
                        : "border-slate-800/40 bg-slate-900/40 text-slate-300 hover:border-slate-700/60 hover:bg-slate-900/70"
                    }`}
                    onclick={() => handleSelect(session)}
                  >
                    <span class="text-sm font-medium text-slate-100 group-hover:text-slate-50">
                      {session.displayName}
                    </span>
                    <span class="text-[0.65rem] uppercase tracking-wide text-slate-500">
                      {session.folder}
                    </span>
                  </button>
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
