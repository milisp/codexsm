import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";
import type { SessionSummary } from "@/types/session";

interface UseSessionActionsProps {
  projectPath: string;
  setSessions: (
    updater: (prev: SessionSummary[]) => SessionSummary[],
  ) => void;
  sessions: () => SessionSummary[];
  setSelectedKey: (key: string | null) => void;
  selectedKey: () => string | null;
  onSelect: (session: SessionSummary | null) => void;
}

export const useSessionActions = (props: UseSessionActionsProps) => {
  const [error, setError] = createSignal<string | null>(null);
  const [editingSessionId, setEditingSessionId] = createSignal<string | null>(
    null,
  );

  const handleDelete = async (sessionToDelete: SessionSummary) => {
    try {
      await invoke("delete_session_file", {
        projectPath: props.projectPath,
        sessionPath: sessionToDelete.path,
      });
      props.setSessions((prevSessions) =>
        prevSessions.filter((s) => s.session_id !== sessionToDelete.session_id),
      );
      if (props.selectedKey() === sessionToDelete.session_id) {
        props.onSelect(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

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
      props.setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.session_id === session.session_id
            ? { ...s, text: newTitle.trim() }
            : s,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditingSessionId(null);
    }
  };

  return {
    handleDelete,
    handleRename,
    editingSessionId,
    setEditingSessionId,
    error,
    setError,
  };
};
