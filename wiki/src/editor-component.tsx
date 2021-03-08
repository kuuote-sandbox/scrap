import React from "./react.js";

const {
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} = React;

import type { Cursor } from "./model.d.ts";
import { Editor } from "./editor.ts";
import { LineComponent } from "./line.tsx";
import { getOpenHandler } from "./link.ts";

// 行の要素と文字数から折り返し付きの位置情報リストを返す
// thanks @takker
// https://scrapbox.io/villagepump/2021%2F01%2F30#60154cca1280f000008e8fc1
const getLineCharsWithWrap = (line: Element, length: number) => {
  const chars: Array<[number, DOMRect]> = [];
  for (let i = 0; i < length; i++) {
    const char = line.querySelector(`.c-${i}`);
    if (char) {
      chars.push([i, char.getBoundingClientRect()]);
    } else {
      console.log("getLineCharsWithWrap: 描画に失敗してそう");
    }
  }
  // 論理行の開始地点を計算
  // width !== 0 が入っているのは記法部分を隠した時に発生する0幅文字を除外するため
  const starts = chars.filter((c) => c[1].width !== 0).flatMap((char, index) =>
    index === 0 ||
      char[1].left <= chars[index - 1][1].left
      ? [char[0]]
      : []
  );
  return starts.map((start, i) => chars.slice(start, starts[i + 1] ?? length));
};

export const PageComponent: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [senderRunning, setSenderRunning] = useState(false);
  useEffect(() => {
    editor.sender.callback = (running) => {
      setSenderRunning(running);
    };
  });
  return (
    <>
      <nav className={senderRunning ? "unsent" : ""}>
        <a href="/wiki" onClick={getOpenHandler("/wiki")}>Zatsu wiki</a>
      </nav>
      <div className="page">
        <EditorComponent editor={editor} />
      </div>
    </>
  );
};

export const EditorComponent: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [cursor, setCursor] = useState<Cursor>(editor.state.cursor);
  const [cursorState, setCursorState] = useState(
    { x: -1, y: -1, h: -1, visible: false },
  );
  const [lines, setLines] = useState(editor.state.lines);
  const clickPage = (e: React.MouseEvent<Element>) => {
    const target = e.target as Element;
    const lineElement = target.closest(".line");
    if (!lineElement) {
      setCursor({ line: -1, column: -1 });
      return;
    }
    const parsedLine = lineElement.className.match(/l-(\d+)/);
    if (!parsedLine) {
      throw new Error("lineのクラス指定おかしいっぽい");
    }
    const line = parseInt(parsedLine[1]);

    // 行の中の文字を走査して折り返しごとに分別する
    const chars = getLineCharsWithWrap(lineElement, lines[line].text.length);
    // 空行の場合
    if (chars.length === 0) {
      editor.setCursor(line, 0);
      return;
    }
    // 折り返しの数と全体の高さから1行辺りの高さを出す
    const lineRect = lineElement.getBoundingClientRect();
    const oneLineHeight = lineRect.height / chars.length;
    // クリックされた高さからどの行かを出す
    const lineColumn = Math.floor((e.clientY - lineRect.top) / oneLineHeight);
    const lineChars = chars[lineColumn];
    // その行の文字を走査してどこがクリックされたのか出す
    // 文字よりも左がクリックされていたら左端
    if (e.clientX < lineChars[0][1].left) {
      editor.setCursor(line, lineChars[0][0]);
      return;
    }
    // そうじゃなければ文字を走査
    for (const c of lineChars) {
      if (e.clientX <= c[1].right) {
        // 要素の左半分ならその要素、右半分なら次の要素
        const offset = Math.round((e.clientX - c[1].left) / c[1].width);
        editor.setCursor(line, c[0] + offset);
        return;
      }
    }
    // どの条件にも引っ掛からなかったら右端
    editor.setCursor(line, lineChars[lineChars.length - 1][0] + 1);
  };
  // 座標を計算してカーソルを表示する
  useLayoutEffect(() => {
    // 一応表示できるようになった
    const error = (msg?: string) => {
      if (msg) {
        console.log("cursor calculate error by");
        console.log(msg);
      }
      setCursorState({ x: -1, y: -1, h: -1, visible: false });
    };
    if (cursor.line === -1) {
      return error();
    }
    const line = document.querySelector(`.l-${cursor.line}`);
    if (!line) {
      return error("!line");
    }
    const col = cursor.column;
    const len = lines[cursor.line].text.length;
    const char = line.querySelector(
      `.c-${Math.max(0, Math.min(col, len - 1))}`,
    );
    if (!char) {
      return error("!char");
    }
    const rect = char.getBoundingClientRect();
    const absX = col === len && !char.className.includes("dummy")
      ? rect.right
      : rect.left;
    if (char.className.includes("space")) {
      const indent = (char.parentNode?.children.length ?? 1) - 1; // dotの分を-1する
      const textChar = line.querySelector(`.c-${indent}`);
      if (!textChar) {
        return error(`!textChar .c-${indent}`);
      }
      const textCharRect = textChar.getBoundingClientRect();
      setCursorState(
        {
          x: absX + window.scrollX,
          y: textCharRect.top + window.scrollY,
          h: textCharRect.height,
          visible: true,
        },
      );
    } else {
      setCursorState(
        {
          x: absX + window.scrollX,
          y: rect.top + window.scrollY,
          h: rect.height,
          visible: true,
        },
      );
    }
  }, [cursor]);

  // editor

  useEffect(() => {
    editor.hook((state) => {
      if (!Object.is(lines, state.lines)) setLines(state.lines);
      if (!Object.is(cursor, state.cursor)) setCursor(state.cursor);
    });
  }, []);

  const updateInput = (e: HTMLTextAreaElement) => {
    editor.action({
      action: "add",
      line: cursor.line,
      column: cursor.column,
      text: e.value,
    });
    e.value = "";
  };

  // IME state
  // IMEを使って入力してる間のonChangeを無視する

  const [isHenkan, setHenkan] = useState(false);
  const [inputWidth, setInputWidth] = useState(0);

  const composeUp = () => {
    setHenkan(true);
  };

  const composeDown = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setHenkan(false);
    // onChangeの後に呼ばれるので明示的に更新を走らせる
    updateInput(e.currentTarget);
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isHenkan) {
      const t = e.currentTarget;
      const cw = t.style.width;
      t.style.width = "0px";
      setInputWidth(e.currentTarget.scrollWidth);
      t.style.width = cw;
    } else {
      updateInput(e.currentTarget);
    }
  };

  const handleBackSpace = () => {
    const cursor = editor.state.cursor;
    if (cursor.line === -1) return;
    if (cursor.line === 0 && cursor.column === 0) return;
    const state = { lines, cursor };
    if (cursor.column === 0) {
      editor.action({
        action: "join",
        line: state.cursor.line - 1,
      });
    } else {
      editor.action({
        action: "delete",
        line: state.cursor.line,
        column: state.cursor.column,
        forward: false,
      });
    }
  };

  const handleEnter = () => {
    const text = editor.state.lines[cursor.line].text;
    const indent = text.length - text.trimStart().length;
    editor.action({
      action: "split",
      line: cursor.line,
      column: cursor.column,
    });
    if (indent !== 0) {
      editor.action({
        action: "add",
        line: cursor.line + 1,
        column: 0,
        text: " ".repeat(Math.min(cursor.column, indent)),
      });
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isHenkan) return;
    let prevent = true;
    if (e.ctrlKey) {
      switch (e.keyCode) {
        case 37: // Left
          break;
        case 38: // Up
          break;
        case 39: // Right
          break;
        case 40: // Down
          break;
        default:
          prevent = false;
      }
    } else if (e.altKey) {
      switch (e.keyCode) {
        case 72: // h
          editor.cursorJump(false);
          break;
        case 76: // l
          editor.cursorJump(true);
          break;
        default:
          prevent = false;
      }
    } else {
      switch (e.keyCode) {
        case 8: // BackSpace
          handleBackSpace();
          break;
        case 13: // Enter
          handleEnter();
          break;
        case 37: // Left
          editor.cursorLeft();
          break;
        case 38: // Up
          break;
        case 39: // Right
          editor.cursorRight();
          break;
        case 40: // Down
          break;
        default:
          prevent = false;
      }
    }
    if (prevent) {
      e.preventDefault();
    }
  };

  // スワイプでカーソルを動かすやつ
  const [onTouchStart, onTouchMove] = useMemo(() => {
    let currentPos = -1;
    let currentScrollY = -1;
    const start = (e: React.TouchEvent<Element>) => {
      currentPos = e.targetTouches[0].screenX;
      currentScrollY = window.scrollY;
    };
    const move = (e: React.TouchEvent<Element>) => {
      // スクロール中に発動するのを防ぐ
      if (window.scrollY !== currentScrollY) {
        currentPos = e.targetTouches[0].screenX;
        return;
      }
      const offset = e.targetTouches[0].screenX - currentPos;
      if (offset < -15) {
        editor.cursorLeft();
      } else if (15 < offset) {
        editor.cursorRight();
      } else {
        return;
      }
      currentPos = e.targetTouches[0].screenX;
    };
    return [start, move];
  }, []);

  // カーソルが移動した時にTextAreaにフォーカスする
  useLayoutEffect(() => {
    const dom = document.querySelector("textarea");
    if (dom && cursorState.visible) {
      dom.focus();
      dom.scrollIntoView({ block: "nearest" });
    }
  }, [cursorState]);

  // View生成

  const linesView = useMemo(
    () =>
      lines.map((l, i) =>
        <LineComponent cursorLine={i === cursor.line} line={l} index={i} />
      ),
    [lines, cursor.line],
  );

  // UserCSS
  //
  const project = window.location.pathname.split("/")[2];
  const css = project
    ? (<link
      rel="stylesheet"
      href={`/api/page/${project}/UserCSS`}
    />)
    : null;

  return (
    <span
      onClick={clickPage}
      onTouchMove={onTouchMove}
      onTouchStart={onTouchStart}
    >
      <span
        className="cursor"
        style={{
          backgroundColor: (!cursorState.visible || isHenkan)
            ? "transparent"
            : "black",
          height: `${cursorState.h}px`,
          left: cursorState.x,
          top: cursorState.y,
          width: "1px",
        }}
      />
      <textarea
        className="input"
        style={{
          height: `${cursorState.h}px`,
          lineHeight: `${cursorState.h}px`,
          left: cursorState.x,
          top: cursorState.y,
          width: (isHenkan ? inputWidth : 0).toString() + "px",
          opacity: isHenkan ? 1 : 0,
        }}
        onChange={onChange}
        onCompositionEnd={composeDown}
        onCompositionStart={composeUp}
        onKeyDown={onKeyDown}
        spellCheck="false"
        wrap="off"
      />
      <span className="lines">
        {linesView}
      </span>
      {css}
    </span>
  );
};
