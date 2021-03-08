import type { EditAction } from "./action.d.ts";

export class Sender {
  apiPath = "";
  etag = "";
  queue: Array<EditAction> = [];

  abortController = new AbortController();
  callback: (running: boolean) => void = () => {
    console.log("call default callback");
  };
  sender: Promise<void> | null = null;

  setPage(projectPath: string, etag: string) {
    if (this.sender) {
      // Promise無いのに呼ぶとabortが予約される
      this.abortController.abort();
      this.sender = null;
    }
    this.etag = etag;
    this.apiPath = `/api/page/${projectPath}`;
  }

  onFail(unsendMsg: Array<EditAction>) {
    this.queue.unshift(...unsendMsg);
    this.sender = null;
    alert("push edit state failed");
  }

  sendMessage() {
    if (this.sender || this.queue.length === 0) {
      this.callback(false);
      return;
    }
    const msg = this.queue;
    this.queue = [];
    this.callback(true);
    this.sender = fetch(this.apiPath, {
      method: "PUT",
      headers: {
        "Content-Type": "text/plain",
        "If-Match": this.etag,
      },
      body: JSON.stringify(msg),
      signal: this.abortController.signal,
    }).then((res) => {
      if (res.status === 412) {
        return this.onFail(msg);
      }
      this.etag = res.headers.get("ETag") ?? "error";
      this.sender = null;
      this.sendMessage();
    }).catch((err) => {
      if (err.name === "AbortError") {
        // 手でキャンセルされた時は何もしない
        console.log("abort");
        return;
      }
      this.onFail(msg);
    });
  }

  postMessage(msg: EditAction) {
    this.queue.push(msg);
    this.sendMessage();
  }
}
