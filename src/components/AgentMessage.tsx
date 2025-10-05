import { Component, Show } from "solid-js";

export interface AgentMessageProps {
  content: string;
  variant?: string;
}

const AgentMessage: Component<AgentMessageProps> = (props) => (
  <article
    class="mr-auto flex w-full max-w-[95%] flex-col gap-2 rounded-xl border border-slate-700/40 bg-slate-900/70 text-sm text-slate-100 shadow-lg shadow-slate-950/40 backdrop-blur md:max-w-[80%]"
    classList={{
      "border-dashed border-slate-600/70 bg-slate-900/60": props.variant === "reasoning",
    }}
  >
    <span class="flex">
      <Show when={props.variant === "reasoning"}>
        🧠
      </Show>
      <p class="whitespace-pre-wrap leading-relaxed">{props.content}</p>
    </span>
  </article>
);

export default AgentMessage;
