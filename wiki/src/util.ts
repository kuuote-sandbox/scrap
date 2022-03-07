import type { MutableRefObject } from "./deps.tsx";
import { useRef } from "./deps.tsx";

export const generateID = (() => {
  let id = 0;
  return () => {
    return id++;
  };
})();

export const useFuncRef = <T>(func: () => T): MutableRefObject<T> => {
  const ref = useRef(null as unknown as T);
  if (ref.current === null) {
    ref.current = func();
  }
  return ref;
};
