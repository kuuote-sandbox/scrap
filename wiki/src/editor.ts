/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />

import { React, ReactDOM } from "./deps.tsx";
import type { EditAction } from "./action.d.ts";
import type { Line } from "./model.d.ts";
import { Sender } from "./sender.ts";
import { buildLine, parseText } from "./line.tsx";
import { PageComponent } from "./editor-component.tsx";

type EditState = {
  lines: Array<Line>;
  cursor: {
    line: number;
    column: number;
  };
};

const mapLine = (
  line: Line,
  f: (line: Line) => Partial<Line>,
): Line => {
  const newLine = Object.assign({ ...line }, f(line));
  if (line.text !== newLine.text) {
    newLine.dom = parseText(newLine.text);
  }
  return newLine;
};

const mapLines = (
  lines: Array<Line>,
  f: (lines: Array<Line>) => Array<Line>,
): Array<Line> => f([...lines]);

const mapLines1 = (
  lines: Array<Line>,
  index: number,
  f: (line: Line) => Partial<Line>,
) =>
  mapLines(lines, (lines) => {
    lines[index] = mapLine(lines[index], f);
    return lines;
  });

const edit = (
  state: Readonly<EditState>,
  msg: EditAction,
): EditState => {
  const { lines } = state;
  const result = { ...state };
  switch (msg.action) {
    case "add":
      result.lines = mapLines1(lines, msg.line, (line) => {
        const origin = line.text;
        const a = origin.slice(0, msg.column);
        const b = origin.slice(msg.column, origin.length);
        const newText = a + msg.text + b;
        return { text: newText };
      });
      result.cursor = {
        line: msg.line,
        column: msg.column + msg.text.length,
      };
      break;
    case "change":
      result.lines = mapLines1(lines, msg.line, () => ({ text: msg.text }));
      result.cursor = { line: msg.line, column: 0 };
      break;
    case "delete": {
      const offset = msg.forward ? 0 : -1;
      result.lines = mapLines1(lines, msg.line, (line) => {
        const a = line.text.slice(0, msg.column + offset);
        const b = line.text.slice(msg.column + offset + 1, line.text.length);
        return { text: a + b };
      });
      result.cursor = { line: msg.line, column: msg.column + offset };
      break;
    }
    case "join":
      result.cursor = { line: msg.line, column: lines[msg.line].text.length };
      result.lines = mapLines(lines, (lines) => {
        lines[msg.line] = mapLine(
          lines[msg.line],
          (line) => ({ text: line.text + lines[msg.line + 1].text }),
        );
        lines.splice(msg.line + 1, 1);
        return lines;
      });
      break;
    case "split": {
      let splitIndent = 0;
      result.lines = mapLines(lines, (lines) => {
        const origin = lines[msg.line];
        const a = origin.text.slice(0, msg.column);
        splitIndent = a.trimStart().length - a.length;
        const b = origin.text.slice(msg.column, origin.text.length);
        lines[msg.line] = mapLine(lines[msg.line], () => ({ text: a }));
        lines.splice(
          msg.line + 1,
          0,
          buildLine(b),
        );
        return lines;
      });
      result.cursor = { line: msg.line + 1, column: splitIndent };
      break;
    }
  }
  return result;
};

export class Editor {
  writable = true;
  state: EditState;
  sender: Sender;
  callback = (state: EditState) => {
    console.log("editor: callback fired");
    console.log(state);
  };

  constructor() {
    this.state = { lines: [], cursor: { line: -1, column: -1 } };
    this.sender = new Sender();
  }

  action(msg: EditAction) {
    this.state = edit(this.state, msg);
    this.callback(this.state);
    this.sender.postMessage(msg);
  }

  cursorLeft() {
    const { line, column } = this.state.cursor;
    if (line === -1) {
      return;
    }
    if (column === 0) {
      if (line === 0) {
        return;
      }
      this.setCursor(line - 1, this.state.lines[line - 1].text.length);
    } else {
      this.setCursor(line, column - 1);
    }
  }

  cursorRight() {
    const { line, column } = this.state.cursor;
    if (line === -1) {
      return;
    }
    const lines = this.state.lines;
    if (column === lines[line].text.length) {
      if (line === lines.length - 1) {
        return;
      }
      this.setCursor(line + 1, 0);
    } else {
      this.setCursor(line, column + 1);
    }
  }

  cursorJump(forward: boolean) {
    const { line } = this.state.cursor;
    const text = this.state.lines[line].text;
    if (forward) {
      this.setCursor(line, text.length);
    } else {
      const nonSpaceIndex = text.search(/\S/);
      this.setCursor(line, Math.max(0, nonSpaceIndex)); // -1 なら 0 にする
    }
  }

  setCursor(line: number, column: number) {
    if (!this.writable) {
      return;
    }
    this.state = Object.assign({}, this.state, { cursor: { line, column } });
    this.callback(this.state);
  }

  setPage(projectPath: string, lines: Array<string>, hash: string) {
    const cursor = { line: -1, column: -1 };
    this.state = { lines: lines.map(buildLine), cursor };
    this.sender.setPage(projectPath, hash);
    this.callback(this.state);
  }

  // カーソルの移動を禁止することによって Readonly 状態を作り出す
  setWritable(flag: boolean) {
    this.writable = flag;
  }

  hook(callback: (state: EditState) => void) {
    this.callback = callback;
  }

  mount(dom: Element) {
    ReactDOM.render(
      React.createElement(PageComponent, { editor: this }),
      dom,
    );
  }
}

export const editor = new Editor();
