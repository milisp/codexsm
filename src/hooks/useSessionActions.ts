import { invoke } from "@tauri-apps/api/core";
import { createSignal } from "solid-js";
import type { ConversationSummary } from "@/types/session";

interface UseSessionActionsProps {
  projectPath: string;
  setSessions: (
    updater: (prev: ConversationSummary[]) => ConversationSummary[],
  ) => void;
  sessions: () => ConversationSummary[];
  setSelectedKey: (key: string | null) => void;
  selectedKey: () => string | null;
  onSelect: (session: ConversationSummary | null) => void;
  selectedSessionIds: () => Set<string>;
  setSelectedSessionIds: (updater: (prev: Set<string>) => Set<string>) => void;
}

export const useSessionActions = (props: UseSessionActionsProps) => {
  const [error, setError] = createSignal<string | null>(null);
  const [editingSessionId, setEditingSessionId] = createSignal<string | null>(
    null,
  );

  const handleDelete = async (sessionToDelete: ConversationSummary) => {
    try {
      await invoke("delete_session_file", {
        projectPath: props.projectPath,
        sessionPath: sessionToDelete.path,
      });
      props.setSessions((prevSessions) =>
        prevSessions.filter((s) => s.conversationId !== sessionToDelete.conversationId),
      );
      if (props.selectedKey() === sessionToDelete.conversationId) {
        props.onSelect(null);
      }
      props.setSelectedSessionIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(sessionToDelete.conversationId);
        return newSet;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleBatchDelete = async (sessionIdsToDelete: string[]) => {
    try {
      await invoke("delete_sessions_files", {
        projectPath: props.projectPath,
        sessionPaths: props.sessions()
          .filter((s) => sessionIdsToDelete.includes(s.conversationId))
          .map((s) => s.path),
      });
      props.setSessions((prevSessions) =>
        prevSessions.filter((s) => !sessionIdsToDelete.includes(s.conversationId)),
      );
      if (sessionIdsToDelete.includes(props.selectedKey() || "")) {
        props.onSelect(null);
      }
      props.setSelectedSessionIds(new Set()); // Clear all selections
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleRename = async (session: ConversationSummary, newTitle: string) => {
    if (newTitle.trim().length === 0) {
      setEditingSessionId(null);
      return;
    }
    try {
      await invoke("update_cache_title", {
        projectPath: props.projectPath,
        sessionPath: session.path,
        preview: newTitle.trim(),
      });
      props.setSessions((prevSessions) =>
        prevSessions.map((s) =>
          s.conversationId === session.conversationId
            ? { ...s, preview: newTitle.trim() }
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
    handleBatchDelete,
    handleRename,
    editingSessionId,
    setEditingSessionId,
    error,
    setError,
  };
};
