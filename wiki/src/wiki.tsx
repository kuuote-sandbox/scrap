/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />

import { editor } from "./editor.ts";
import { route } from "./router.ts";

function mountPage() {
  const dom = document.getElementById("react-root");
  if (!dom) {
    console.error("ドキュメントにreact-root生えてないぞゴルァ");
    return;
  }
  editor.mount(dom);
}

// bfcache対策としてpageshowイベントのタイミングでfetchする
globalThis.addEventListener("pageshow", route);

globalThis.addEventListener("DOMContentLoaded", mountPage);

globalThis.addEventListener("popstate", route);
