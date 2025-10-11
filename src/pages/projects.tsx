import { createSignal, onMount, For, Show, createMemo } from "solid-js";
import { invoke } from "@tauri-apps/api/core";
import { Link } from "@/ui";

interface Project {
  path: string;
  trust_level: string;
}

async function fetchProjects(): Promise<Project[]> {
  return await invoke("read_codex_config");
}

export default function ProjectsPage() {
  const [projects, setProjects] = createSignal<Project[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [searchTerm, setSearchTerm] = createSignal("");

  const scanAndMergeProjects = async () => {
    setError(null);
    setLoading(true);
    try {
      const scannedData: Project[] = await invoke("scan_projects");
      const existingPaths = new Set(projects().map(p => p.path));
      const newProjects = scannedData.filter(p => !existingPaths.has(p.path));
      const combined = [...projects(), ...newProjects];

      setProjects(combined);

    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };


  const filteredProjects = createMemo(() => {
    const term = searchTerm().toLowerCase();
    if (!term) return projects();
    return projects().filter(project => 
      project.path.toLowerCase().includes(term) ||
      project.path.split('/').pop()?.toLowerCase().includes(term)
    );
  });

  const load = async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  onMount(async () => {
    await load();
  });

  return (
    <div class="w-full px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl py-6">
        <div class="flex items-center justify-between mb-6">
          <input
            autofocus={true}
            type="text"
            placeholder="Search projects..."
            class="block w-full rounded-md border border-slate-700/50 bg-slate-800/40 pl-10 pr-3 py-2 text-sm placeholder-slate-400 focus:border-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-600"
            value={searchTerm()}
            onInput={(e) => setSearchTerm(e.currentTarget.value)}
          />
          <button
            class="inline-flex items-center gap-2 rounded-md border border-slate-700/50 px-3 py-1.5 text-sm hover:bg-slate-800/60 active:bg-slate-800 transition-colors"
            onClick={load}
            disabled={loading()}
          >
            <span class="i-heroicons-arrow-path-20-solid hidden h-4 w-4 animate-spin [display:var(--loading-display)]"/>
            <span>Refresh</span>
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-md border border-slate-700/50 px-3 py-1.5 text-sm hover:bg-slate-800/60 active:bg-slate-800 transition-colors"
            onClick={scanAndMergeProjects}
            disabled={loading()}
          >
            <span class="i-heroicons-magnifying-glass-20-solid hidden h-4 w-4 animate-spin [display:var(--loading-display)]"/>
            <span>Scan Untrusted</span>
          </button>
        </div>

        <Show when={error()}>
          <div class="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <div class="flex items-start justify-between gap-4">
              <p>Failed to load projects: {error()}</p>
              <button class="rounded-md border border-red-500/40 px-2 py-1 hover:bg-red-500/10" onClick={load}>Retry</button>
            </div>
          </div>
        </Show>

        <Show when={loading()}>
          <ul class="space-y-3">
            <For each={[1,2,3]}>
              {() => (
                <li class="rounded-lg border border-slate-700/50 bg-slate-800/40 p-4 shadow-sm">
                  <div class="flex items-center justify-between">
                    <div class="h-5 w-32 animate-pulse rounded bg-slate-600/50" />
                    <div class="h-5 w-16 animate-pulse rounded bg-slate-600/50" />
                  </div>
                  <div class="mt-2 h-4 w-2/3 animate-pulse rounded bg-slate-600/50" />
                </li>
              )}
            </For>
          </ul>
        </Show>

        <Show when={!loading() && filteredProjects().length === 0 && !error()}>
          <div class="rounded-lg border border-slate-700/50 bg-slate-800/40 p-8 text-center">
            <p class="text-sm text-slate-400">
              {searchTerm() ? "No projects match your search." : "No projects found."}
            </p>
            <p class="mt-1 text-xs text-slate-500">
              {searchTerm() ? "Try a different search term." : "Add entries to your config to see them here."}
            </p>
          </div>
        </Show>

        <Show when={!loading() && filteredProjects().length > 0}>
          <ul class="space-y-3">
            <For each={filteredProjects()}>
              {(project) => (
                <li>
                  <Link
                    href={`/session?project=${project.path}`}
                    class="group block rounded-lg border border-slate-700/50 bg-slate-800/40 p-4 shadow-sm transition hover:border-slate-600 hover:bg-slate-700/60"
                  >
                    <div class="flex items-center justify-between">
                      <span class="text-base font-semibold tracking-tight">{project.path.split('/').pop()}</span>
                      <span>{project.trust_level}</span>
                    </div>
                    <p class="mt-1 line-clamp-1 text-xs text-slate-400 group-hover:text-slate-300">{project.path}</p>
                  </Link>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
}