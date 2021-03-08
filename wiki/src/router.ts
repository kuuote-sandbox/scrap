import { fetchPages, fetchProjects } from "./project.ts";
import { fetchPage } from "./page.ts";

export const route = () => {
  const split = window.location.pathname.split("/").slice(2); // 切って /wiki の部分を除去
  switch (split.length) {
    case 0:
      return fetchProjects();
    case 1:
      return fetchPages(split[0]);
    case 2:
      return fetchPage(split[0], split[1]);
  }
};

export const openPage = (name: string) => {
  history.pushState({}, name, name);
  route();
};
