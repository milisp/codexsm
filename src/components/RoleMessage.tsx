import { Component } from "solid-js";

export interface RoleMessageProps {
  content: string;
  role: string;
}

const RoleMessage: Component<RoleMessageProps> = (props) => (
  <article class="ml-auto flex w-full max-w-[95%] flex-col gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/20 p-4 text-sm text-slate-100 shadow-lg shadow-indigo-950/30 backdrop-blur md:max-w-[80%]">
    <header class="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-indigo-200">
      <span>{props.role}</span>
    </header>
    <p class="whitespace-pre-wrap leading-relaxed">{props.content}</p>
  </article>
);

export default RoleMessage;
