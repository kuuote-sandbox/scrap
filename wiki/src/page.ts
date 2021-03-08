import { editor } from "./editor.ts";

export async function fetchPage(project: string, page: string) {
  const projectPath = project + "/" + page;
  const res = await fetch(`/api/page/${projectPath}`);
  const etag = res.headers.get("ETag") as string;
  const txt = await res.text();
  const lines = txt.split(/\n/);
  // remove last nl
  // ASCIIテキストは仕様上末尾に改行を持っているので除去
  lines.splice(lines.length - 1, 1);
  // 完全に行がないと編集できないので空行を追加
  if (lines.length === 0) {
    lines.push("");
  }
  editor.setWritable(true);
  editor.setPage(projectPath, lines, etag);
}
