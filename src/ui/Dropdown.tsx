import { createSignal, onCleanup, onMount, Show } from "solid-js";
import type { JSX } from "solid-js";

interface DropdownProps {
  trigger: (props: { ref: (el: HTMLElement) => void; onClick: () => void }) => JSX.Element;
  children: JSX.Element;
  ref?: (dropdown: { close: () => void }) => void;
}

const Dropdown = (props: DropdownProps) => {
  const [isOpen, setIsOpen] = createSignal(false);
  let triggerRef: HTMLElement | undefined;
  let contentRef: HTMLElement | undefined;

  if (props.ref) {
    props.ref({ close: () => setIsOpen(false) });
  }

  const handleClickOutside = (event: MouseEvent) => {
    if (
      triggerRef &&
      !triggerRef.contains(event.target as Node) &&
      contentRef &&
      !contentRef.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <div class="relative">
      {props.trigger({ ref: (el) => (triggerRef = el), onClick: () => setIsOpen(!isOpen()) })}
      <Show when={isOpen()}>
        <div
          ref={(el) => (contentRef = el)}
          class="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-slate-800 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {props.children}
        </div>
      </Show>
    </div>
  );
};

export const DropdownItem = (props: {
  onClick: () => void;
  children: JSX.Element;
}) => {
  return (
    <button
      onClick={props.onClick}
      class="block w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
    >
      {props.children}
    </button>
  );
};

export default Dropdown;
