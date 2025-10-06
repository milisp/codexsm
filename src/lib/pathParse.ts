export function buildDatedPath(path: string) {
    // path example "rollout-2025-09-26T03-33-26-019984f0-ef18-7180-aec0-d3dc52d367d3.jsonl"
    const match = path.match(/(\d{4})-(\d{2})-(\d{2})T/);
    if (!match) return path;
    const [, year, month, day] = match;
    return `.codex/sessions/${year}/${month}/${day}/${path}`;
}