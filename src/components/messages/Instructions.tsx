import { Show, createSignal } from "solid-js";

interface InstructionsProps {
  instructions: string;
}

const Instructions = (props: InstructionsProps) => {
  const [isInstructionsOpen, setIsInstructionsOpen] = createSignal(false);

  return (
    <div class="rounded-xl border border-slate-800/40 bg-slate-900/50 p-2 sm:col-span-2">
      <span class="flex items-center justify-between">
        <span>Instructions</span>
        <button
          type="button"
          class="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-100 transition hover:border-indigo-400/60 hover:bg-indigo-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          aria-expanded={isInstructionsOpen()}
          onclick={() => setIsInstructionsOpen((prev) => !prev)}
        >
          {isInstructionsOpen() ? "Hide" : "Show"}
        </button>
      </span>
      <Show when={isInstructionsOpen()}>
        <p class="whitespace-pre-wrap text-sm text-slate-100">
          {props.instructions || "No instructions provided."}
        </p>
      </Show>
    </div>
  );
};

export default Instructions;
