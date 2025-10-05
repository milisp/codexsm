import { invoke } from "@tauri-apps/api/tauri";

export async function get_session_files(): Promise<string[]> {
  return invoke("get_session_files");
}
