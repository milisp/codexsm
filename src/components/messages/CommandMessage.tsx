import { Component, Show } from "solid-js";
import { CollapsibleContentWrapper } from "../CollapsibleContentWrapper";

export interface CommandMessageProps {
  content: string;
  variant?: string;
}

const CommandMessage: Component<CommandMessageProps> = (props) => (
  <article
    class="mr-auto flex w-full max-w-[95%] flex-col gap-2 rounded-xl border border-slate-700/40 bg-slate-900/70 text-sm text-slate-100 shadow-lg shadow-slate-950/40 backdrop-blur md:max-w-[80%]"
  >
    <span class="flex">
      💻
      <Show when={props.variant === "reasoning"} fallback={
        <CollapsibleContentWrapper content={props.content} />
      }>
        <div class="whitespace-pre-wrap leading-relaxed" innerHTML={props.content} />
      </Show>
    </span>
  </article>
);

export default CommandMessage;