type DeleteAction = {
  action: "delete";
  line: number;
  column: number;
  forward: boolean;
};

type JoinAction = {
  action: "join";
  line: number;
};

type SplitAction = {
  action: "split";
  line: number;
  column: number;
};

type TextAction = {
  action:
    | "add"
    | "change";
  line: number;
  column: number;
  text: string;
};

type EditAction =
  | DeleteAction
  | JoinAction
  | SplitAction
  | TextAction;

export type { EditAction };
