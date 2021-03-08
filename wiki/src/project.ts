import { editor } from "./editor.ts";

export async function fetchProjects() {
  const res = await fetch("/api/projects");
  const json = await res.json();
  if (!(json instanceof Array)) {
    console.log("fetchProjects: illegal json type");
    return;
  }
  const lines: Array<string> = json.map((project) =>
    `[/wiki/${project} ${project}]`
  )
    .sort();
  editor.setWritable(false);
  editor.setPage("", lines, "");
}

export async function fetchPages(project: string) {
  const res = await fetch(`/api/page/${project}`);
  const json = await res.json();
  if (!(json instanceof Array)) {
    console.log("fetchProjects: illegal json type");
    return;
  }
  json.sort((a, b) =>
    a.time === b.time ? a.title <= b.title ? -1 : 1 : b.time - a.time
  );
  const lines: Array<string> = json.map((page) =>
    `[/wiki/${project}/${
      page.title.replace(/\s/g, encodeURIComponent)
    } ${page.title}]`
  );
  editor.setWritable(false);
  editor.setPage("", lines, "");
}
