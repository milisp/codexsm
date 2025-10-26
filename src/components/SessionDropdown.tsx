import { TbDotsVertical } from "solid-icons/tb";
import Dropdown, { DropdownItem } from "@/ui/Dropdown";
import type { ConversationSummary } from "@/types/session";
import { useSessionActions } from "@/hooks/useSessionActions";

interface SessionDropdownProps {
  session: ConversationSummary;
  projectPath: string;
  setSessions: (
    updater: (prev: ConversationSummary[]) => ConversationSummary[],
  ) => void;
  sessions: () => ConversationSummary[];
  setSelectedKey: (key: string | null) => void;
  selectedKey: () => string | null;
  onSelect: (session: ConversationSummary | null) => void;
  handleRename: (session: ConversationSummary, newTitle: string) => Promise<void>;
  setEditingSessionId: (id: string | null) => void;
  selectedSessionIds: () => Set<string>;
  setSelectedSessionIds: (updater: (prev: Set<string>) => Set<string>) => void;
}

const SessionDropdown = (props: SessionDropdownProps) => {
  let dropdownRef: { close: () => void } | undefined;

  const { handleDelete } = useSessionActions({
    projectPath: props.projectPath,
    setSessions: props.setSessions,
    sessions: props.sessions,
    setSelectedKey: props.setSelectedKey,
    selectedKey: props.selectedKey,
    onSelect: props.onSelect,
    selectedSessionIds: props.selectedSessionIds,
    setSelectedSessionIds: props.setSelectedSessionIds,
  });

  return (
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
        <DropdownItem
          onClick={() => void handleDelete(props.session)}
        >
          <span class="z-50">Delete</span>
        </DropdownItem>
        <DropdownItem
          onClick={() => {
            props.setEditingSessionId(props.session.conversationId);
            dropdownRef?.close();
            // Delay selection to allow input to render and focus
            setTimeout(() => {
              const input =
                document.querySelector<HTMLInputElement>(
                  "input[autofocus]",
                );
              if (input) {
                input.select();
              }
            }, 0);
          }}
        >
          <span class="z-50">Rename</span>
        </DropdownItem>
      </Dropdown>
    </div>
  );
};

export default SessionDropdown;
