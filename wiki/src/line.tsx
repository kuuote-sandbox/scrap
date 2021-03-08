import React from "./react.js";
import { generateID } from "./util.ts";
import { getLinkModel } from "./link.ts";
import type { Character, Line, Model } from "./model.d.ts";

const nodes = new Map([["`", "`"], ["[", "]"]]);

const mapToDOM = (model: Model): React.ReactElement => {
  switch (model.type) {
    case "char":
      return (<span
        className={`c-${model.index} ${model.notationChar ? "notation" : ""}`}
      >
        {model.char}
      </span>);
    case "anchor":
      return (<a href={model.href} onClick={model.handler}>
        {model.model.map(mapToDOM)}
      </a>);
    case "quote":
      return (<span className="inline-code">{model.model.map(mapToDOM)}</span>);
  }
};

// ネストした構造を扱うのはunmatch parenの処理が面倒なので後回し
export const parseText = (text: string) => {
  const str = text.trimStart();
  const indent = text.length - str.length;

  // split to indexed characters
  const parsed: Model[] = [];
  const indexed: Character[] = Array.from(str).map((char, index) => ({
    type: "char",
    char: char,
    index: index + indent,
    notationChar: false,
  }));
  let i = 0;
  while (i < indexed.length) {
    const close = nodes.get(indexed[i].char);
    if (close) {
      const sub = [indexed[i++]];
      while (i < indexed.length) {
        const model = indexed[i++];
        sub.push(model);
        if (model.char === close) {
          break;
        }
      }
      if (sub[sub.length - 1].char !== close) {
        parsed.push(...sub);
      } else {
        sub[0].notationChar = true;
        sub[sub.length - 1].notationChar = true;
        // parsed.push(sub);
        switch (sub[0].char) {
          case "[":
            parsed.push(getLinkModel(sub));
            break;
          case "`":
            parsed.push({
              type: "quote",
              model: sub,
            });
            break;
        }
      }
      continue;
    }
    parsed.push(indexed[i++]);
  }
  // and mapping to DOM
  const textDOM = parsed.map(mapToDOM);
  // 行が空の時はダミーDOMを入れる
  if (textDOM.length === 0) {
    textDOM.push(<span className={`dummy c-${indent}`}>a</span>);
  }

  //indent関連はScrapboxより
  //indent-spacesには高さを合わせるために全角スペースを入れている
  const indentStyle = `${indent * 1.5}em`;
  return (
    <>
      <span className="indent">
        {Array.from(
          Array(indent),
          (_, i) => (<span className={`space c-${i}`}></span>),
        )}
        {indent === 0 ? null : <span className={`dot level${indent}`} />}
      </span>
      <span className="text" style={{ marginLeft: indentStyle }}>
        {textDOM}
      </span>
    </>
  );
};

export const buildLine = (text: string): Line => {
  // const text = str.trimStart();
  // const indent = str.length - text.length;
  return {
    id: generateID(),
    text,
    dom: parseText(text),
  };
};

export const LineComponent: React.FC<
  { cursorLine: boolean; line: Line; index: number }
> = (
  props,
) => {
  return (
    <div
      className={`line ${
        props.cursorLine ? "cursor-line" : ""
      } l-${props.index}`}
      key={props.line.id}
    >
      {props.line.dom}
    </div>
  );
};
