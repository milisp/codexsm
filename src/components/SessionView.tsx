import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import ScrollButtons from "./ScrollButtons";
import { readTextFileLines, BaseDirectory } from "@tauri-apps/plugin-fs";
import AgentMessage from "./messages/AgentMessage";
import RoleMessage from "./messages/RoleMessage";
import CommandMessage from "./messages/CommandMessage";
import PlanDisplay, { PlanStatus, SimplePlanStep } from "./messages/PlanDisplay";
import type { SessionMessage, SessionSummary } from "@/types/session";
import Instructions from "./messages/Instructions";

interface SessionData {
  instructions: string;
  cwd: string;
  totalTokens: number;
  messages: SessionMessage[];
}

const normalizeContent = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

interface SessionViewProps {
  summary: SessionSummary | null;
}

const renderMessage = (msg: SessionMessage) => {
  if (msg.type === "agent_message" || msg.type === "agent_reasoning") {
    return <AgentMessage content={msg.content || ""} variant={msg.variant} />;
  }

  if (msg.variant === 'plan') {
    // Map incoming plan shape to PlanDisplay's expected shape.
    const mappedSteps: SimplePlanStep[] = Array.isArray(msg.plan)
      ? msg.plan.map((p) => {
          if (typeof p === "string") {
            return { step: p, status: "pending" as PlanStatus };
          }

          return {
            step: String((p && (((p as any).step ?? (p as any).text ?? (p as any).description))) ?? ""),
            status: (((p as any)?.status) === "completed"
              ? "completed"
              : ((p as any)?.status) === "in_progress"
              ? "in_progress"
              : "pending") as PlanStatus,
          };
        })
      : [];

    if (mappedSteps.length === 0) {
      return (
        <article class="message">
          <p class="message__body">No plan data available.</p>
        </article>
      );
    }

    return <PlanDisplay steps={mappedSteps} />;
  }

  if (msg.type === "function_call") {
    return <CommandMessage content={msg.content || ""} variant={msg.variant} />;
  }

  if (msg.role === "user" || msg.role === "assistant") {
    return <RoleMessage content={msg.content || ""} role={msg.role} />;
  }

  return (
    <article class="message">
      <p class="message__body">{msg.content}</p>
    </article>
  );
};

const SessionView = (props: SessionViewProps) => {
  const [instructions, setInstructions] = createSignal("");
  const [cwd, setCwd] = createSignal("");
  const [totalTokens, setTotalTokens] = createSignal(0);
  const [messages, setMessages] = createSignal<SessionMessage[]>([]);
  const [isSessionLoading, setIsSessionLoading] = createSignal(false);
  const [sessionError, setSessionError] = createSignal<string | null>(null);
  const [sessionCache, setSessionCache] = createSignal<Record<string, SessionData>>({});

  const hasMessages = createMemo(() => messages().length > 0);
  const hasSelection = createMemo(() => Boolean(props.summary));
  let activeRequestId = 0;
  let messagesContainer: HTMLElement | undefined;

  const resetSessionView = () => {
    setInstructions("");
    setCwd("");
    setTotalTokens(0);
    setMessages([]);
  };

  const applySessionData = (data: SessionData | null) => {
    if (!data) {
      resetSessionView();
      return;
    }

    setInstructions(data.instructions);
    setCwd(data.cwd);
    setTotalTokens(data.totalTokens);
    setMessages(() => data.messages);
  };

  const parseEventMessage = (
    payload: any,
    parsedMessages: SessionMessage[],
    nextIndex: () => number,
    setTokenTotal: (value: number) => void,
  ) => {
    // console.log(payload.type)
    switch (payload.type) {
      case "token_count": {
        const total = payload?.info?.total_token_usage?.total_tokens;
        if (typeof total === "number") {
          setTokenTotal(total);
        }
        break;
      }
      case "agent_reasoning": {
        const content = normalizeContent(payload.text);
        if (content) {
          parsedMessages.push({
            id: `agent_reasoning-${nextIndex()}`,
            type: payload.type,
            content,
            variant: "reasoning",
          });
        }
        break;
      }
      case "agent_message": {
        const content = normalizeContent(payload.message ?? payload.text);
        if (content) {
          parsedMessages.push({
            id: `agent_message-${nextIndex()}`,
            type: payload.type,
            content,
            variant: "response",
          });
        }
        break;
      }
      case "user_message": {
        const content = normalizeContent(payload.message ?? payload.text);
        if (content) {
          parsedMessages.push({
            id: `user_message-${nextIndex()}`,
            role: "user",
            type: payload.type,
            content,
          });
        }
        break;
      }
      default:
        break;
    }
  };

  const parseResponseItem = (
    payload: any,
    parsedMessages: SessionMessage[],
    nextIndex: () => number,
  ) => {
    // console.log(payload.type)
    switch (payload.type) {
      case "function_call": {
        const args = JSON.parse(payload.arguments)
        console.log("args:", typeof(args), args)
        try {
          const content = normalizeContent(args.command.join(" "));
          if (content) {
            let formattedContent = content;
            if (content.includes("apply_patch")) {
              const updateFileMatch = content.match(/\*\*\* Update File: (.*)/);
              const filename = updateFileMatch ? updateFileMatch[1] : "Unknown File";
              formattedContent = `<details><summary>Update File: ${filename}</summary>\n\n<pre><code>${content}</code></pre>\n</details>`;
            }
            parsedMessages.push({
              id: `function_call_command-${nextIndex()}`,
              type: payload.type,
              content: formattedContent,
              variant: "reasoning",
            });
          }
        } catch (error) {
          // args.plan can be an array, a JSON string, or an object containing a `plan` array.
          const rawPlan = args.plan;
          let planData: any = undefined;

          if (Array.isArray(rawPlan)) {
            planData = rawPlan;
          } else if (typeof rawPlan === "string") {
            try {
              const parsed = JSON.parse(rawPlan);
              if (Array.isArray(parsed)) planData = parsed;
              else if (parsed && Array.isArray(parsed.plan)) planData = parsed.plan;
            } catch (e) {
              // not JSON, ignore
            }
          }
          else if (rawPlan && typeof rawPlan === "object" && Array.isArray(rawPlan.plan)) {
            planData = rawPlan.plan;
          }

          if (planData && Array.isArray(planData) && planData.length > 0) {
            parsedMessages.push({
              id: `function_call_plan-${nextIndex()}`,
              type: payload.type,
              plan: planData,
              variant: "plan",
            });
          }
        }
        break;
      }
      case "function_call_output": {
        const content = normalizeContent(payload.output.output);
        if (content) {
          parsedMessages.push({
            id: `function_call_output-${nextIndex()}`,
            type: payload.type,
            content,
            variant: "reasoning",
          });
        }
        break;
      }
      default:
        break;
    }
  };

  const loadSession = async (summary: SessionSummary, options: { force?: boolean } = {}) => {
    const { session_id, path } = summary;
    const { force = false } = options;

    const cache = sessionCache();
    const cachedSession = cache[session_id];
    if (cachedSession && !force) {
      applySessionData(cachedSession);
      setSessionError(null);
      setIsSessionLoading(false);
      return;
    }

    const requestId = ++activeRequestId;
    setIsSessionLoading(true);
    setSessionError(null);
    resetSessionView();

    try {
      const lines = await readTextFileLines(path, {baseDir: BaseDirectory.Home});
      console.log(lines)

      const parsedMessages: SessionMessage[] = [];
      let counter = 0;
      const nextIndex = () => counter++;
      let nextInstructions = "";
      let nextCwd = "";
      let nextTotalTokens = 0;
      const recordTotalTokens = (value: number) => {
        nextTotalTokens = value;
      };

      for await (const line of lines) {
        if (!line) continue;
        const cleanedLine = line.replace(/\0/g, "");
        if (!cleanedLine.trim()) continue;

        try {
          const parsed = JSON.parse(cleanedLine);
          const payload = parsed?.payload ?? {};

          switch (parsed.type) {
            case "session_meta":
              if (typeof payload.instructions === "string") {
                nextInstructions = payload.instructions;
              }
              if (typeof payload.cwd === "string") {
                nextCwd = payload.cwd;
              }
              break;
            case "event_msg":
              parseEventMessage(payload, parsedMessages, nextIndex, recordTotalTokens);
              break;
            case "response_item":
              parseResponseItem(payload, parsedMessages, nextIndex);
              break;
            case "turn_context":
              // console.log("turn_context parsed.type:", parsed.type, parsed)
              break;
            default:
              // console.log("parsed.type:", parsed.type, parsed)
              break;
          }
        } catch (parseError) {
          console.error("Unable to parse session line", parseError);
        }
      }

      const sessionData: SessionData = {
        instructions: nextInstructions,
        cwd: nextCwd,
        totalTokens: nextTotalTokens,
        messages: parsedMessages,
      };

      if (requestId !== activeRequestId) {
        return;
      }

      applySessionData(sessionData);
      setSessionCache((prev) => ({ ...prev, [session_id]: sessionData }));
    } catch (fsError) {
      console.error("Failed to read session file", fsError);

      if (requestId !== activeRequestId) {
        return;
      }

      applySessionData(null);
      setSessionError("Unable to read the session file. Please confirm the path and try again.");
    } finally {
      if (requestId === activeRequestId) {
        setIsSessionLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    const summary = props.summary;
    if (summary) {
      void loadSession(summary, { force: true });
    }
  };

  createEffect(() => {
    const summary = props.summary;

    if (!summary) {
      setSessionError(null);
      setIsSessionLoading(false);
      resetSessionView();
      return;
    }

    void loadSession(summary);
  });

  const scrollToTop = () => {
    if (!messagesContainer) return;
    messagesContainer.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    if (!messagesContainer) return;
    messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: "smooth" });
  };

  return (
    // make this view fill the viewport like the conversations list so heights match
    <div class="flex flex-col w-full h-screen">
      <section class="rounded-2xl border border-slate-700/40 bg-slate-950/60 p-6 shadow-lg shadow-slate-950/40">
        <div class="flex flex-wrap items-center justify-between">
          {cwd() || "Unknown"}
          <span class="flex gap-2">
            <span class="items-center">Token {Math.trunc(totalTokens() / 1000)}k</span>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-md border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs font-semibold text-indigo-100 transition hover:border-indigo-400/70 hover:bg-indigo-500/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              onclick={handleRefresh}
              disabled={!hasSelection() || isSessionLoading()}
            >
              {isSessionLoading() ? "Refreshing…" : "Refresh"}
            </button>
          </span>
        </div>
        <Show when={sessionError()}>
          {(message) => (
            <p class="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-2 text-xs text-red-200">
              {message()}
            </p>
          )}
        </Show>
          <Instructions instructions={instructions()} />
      </section>

      <section
        class="rounded-2xl border border-slate-700/30 bg-slate-950/50 p-4 shadow-lg shadow-slate-950/40 overflow-y-auto flex-1 min-h-0 relative"
        ref={(el) => (messagesContainer = el as HTMLDivElement)}
      >
        <Show
          when={hasMessages()}
          fallback={
            <p class="py-6 text-center text-sm text-slate-500">
              {isSessionLoading()
                ? "Loading conversation…"
                : hasSelection()
                ? "No messages found for this session."
                : "Select a conversation to view messages."}
            </p>
          }
        >
          <ul class="flex flex-col gap-3 pb-12">
            <For each={messages()}>{(msg) => <li class="flex">{renderMessage(msg)}</li>}</For>
          </ul>
        </Show>
      </section>

      <ScrollButtons
        onScrollToTop={scrollToTop}
        onScrollToBottom={scrollToBottom}
        hasMessages={hasMessages()}
      />
    </div>
  );
};

export default SessionView;
