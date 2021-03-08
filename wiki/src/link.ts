import React from "./react.js";
import { openPage } from "./router.ts";
import type { Character, LinkNotation } from "./model.d.ts";

const getTransitionHandler = (name: string) =>
  getClickHandler(() => openPage(name));

export const getOpenHandler = (url: string) =>
  getClickHandler(() => {
    if (url[0] === "/") {
      openPage(url);
    } else {
      window.open(url, "_blank", "noreferrer=yes");
    }
  });

const getClickHandler = (callback: () => void) =>
  (e: React.MouseEvent) => {
    callback();
    e.preventDefault();
    e.stopPropagation();
  };

const urlRegexp = /(\s+)?([^\s]+:\/\/[^\s]+)(\s+)?/;
const innerLinkRegexp = /(\s+)?(\/[^\s]+)(\s+)?/;

export const getLinkModel = (chars: Character[]): LinkNotation => {
  const type = "anchor";
  const value = chars.map((m) => m.char).join("").slice(1, -1);

  const url = value.match(urlRegexp) || value.match(innerLinkRegexp);
  if (url) {
    // 元データのURL部分のインデックス
    const urlStart = value.indexOf(url[0]) + 1;
    const urlEnd = urlStart + url[0].length; // - 1 + 1

    const href = url[2];
    const fold = url[0] !== href;
    return {
      type,
      model: chars.map((model, index, it) => {
        const newModel = { ...model };
        newModel.notationChar = index === 0 || index === it.length - 1 ||
          fold && urlStart <= index && index < urlEnd;
        return newModel;
      }),
      handler: getOpenHandler(href),
      href,
    };
  }
  return {
    type,
    model: chars,
    handler: getTransitionHandler(value),
    href: value,
  };
};
