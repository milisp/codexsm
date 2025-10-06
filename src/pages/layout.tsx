import { type ParentProps } from "solid-js";

export default function Layout(props: ParentProps) {
  return (
    <main class="min-h-screen bg-slate-950 font-sans text-slate-100">
      <div class="mx-auto w-screen">
        {props.children}
      </div>
    </main>
  );
}
