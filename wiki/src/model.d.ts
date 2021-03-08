/* これmodelにあるの変だよね */
export type Cursor = {
  line: number;
  column: number;
};

export type Line = {
  id: number;
  text: string;
  dom: React.ReactElement;
};

type Character = {
  type: "char";
  char: string;
  index: number;
  notationChar: boolean;
};

type LinkNotation = {
  type: "anchor";
  model: Model[];
  handler: (e: React.MouseEvent) => void;
  href: string;
};

type QuoteNotation = {
  type: "quote";
  model: Model[];
};

type Notation = LinkNotation | QuoteNotation;

type Model = Character | Notation;
