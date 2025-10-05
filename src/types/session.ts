import { BaseDirectory } from "@tauri-apps/plugin-fs";

export interface SessionSummary {
  key: string;
  path: string;
  displayName: string;
  folder: string;
  baseDir: BaseDirectory;
}

export interface Plan {
  step: string;
  status: string;
}

export type MessageRole = "user" | "assistant";
export type MessageVariant = "reasoning" | "response" | "plan";

export interface SessionMessage {
  id: string;
  role?: MessageRole;
  type: string;
  content?: string;
  plan?: Plan[];
  variant?: MessageVariant;
}
