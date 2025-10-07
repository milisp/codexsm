import { Collapsible } from "@/ui/collapsible";
import { Component, Show, createMemo } from "solid-js";

export const CollapsibleContentWrapper: Component<{ content: string }> = (props) => {
    const hasMultipleLines = createMemo(() => props.content.includes("\n"));
  
    return (
      <Show when={hasMultipleLines()} fallback={<p class="whitespace-pre-wrap leading-relaxed">{props.content}</p>}>
        <Collapsible>
          <Collapsible.Trigger class="flex items-center">
            <Collapsible.Arrow />
            <h3 class="whitespace-pre-wrap leading-relaxed">
              {props.content.split("\n")[0]}
            </h3>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <p class="whitespace-pre-wrap leading-relaxed">{props.content.split("\n").slice(2).join("\n")}</p>
          </Collapsible.Content>
        </Collapsible>
      </Show>
    );
  };
  