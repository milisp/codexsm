import { Show } from "solid-js";

interface ScrollButtonsProps {
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  hasMessages: boolean;
}

const ScrollButtons = (props: ScrollButtonsProps) => {
  return (
    <Show when={props.hasMessages}>
      <div class="fixed right-3 bottom-3 flex flex-col gap-2 z-50">
        <button
          type="button"
          class={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/40 bg-slate-900/60 text-slate-200 transition ${{
            true: "hover:bg-slate-900/80",
          }[String(props.hasMessages)]}`}
          title="Scroll to top"
          onclick={props.onScrollToTop}
          disabled={!props.hasMessages}
          aria-hidden={!props.hasMessages}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4">
            <path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14.17 12 8.17 6 14.17z" />
          </svg>
        </button>
        <button
          type="button"
          class={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/40 bg-slate-900/60 text-slate-200 transition ${{
            true: "hover:bg-slate-900/80",
          }[String(props.hasMessages)]}`}
          title="Scroll to bottom"
          onclick={props.onScrollToBottom}
          disabled={!props.hasMessages}
          aria-hidden={!props.hasMessages}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-4 w-4">
            <path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 9.83 12 15.83 6 9.83z" />
          </svg>
        </button>
      </div>
    </Show>
  );
};

export default ScrollButtons;
