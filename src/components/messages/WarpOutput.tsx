import { Collapsible } from "@/ui/collapsible";
import { Component } from "solid-js";

interface WarpOutputProps {
  content: string;
  title?: string;
}

export const WarpOutput: Component<WarpOutputProps> = (props) => {
    return (
        <Collapsible>
          <Collapsible.Trigger class="flex items-center">
            <Collapsible.Arrow />
            <h3 class="whitespace-pre-wrap leading-relaxed">
              {props.title}
            </h3>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <p class="whitespace-pre-wrap leading-relaxed">{props.content}</p>
          </Collapsible.Content>
        </Collapsible>
    );
  };
  