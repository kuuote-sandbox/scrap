package main

import (
	"fmt"
	"io/ioutil"
	"path/filepath"
)

const head = `
<html>
<head>
  <meta http-equiv="Content-type" content="text/html;charset=utf-8">
	<meta name="MobileOptimized" content="width">
	<meta name="HandheldFriendly" content="true">
	<meta name="viewport" content="width=device-width">
  <link href="style.css" rel="stylesheet" type="text/css">
</head>
`

const nav = `
<nav>
  <a href=index.html>Zatsu wiki</a>
  <a href=pages.html>Pages</a>
</nav>
`

const css = `
body {
  margin: 0;
  background-color: #c0c0ff;
}
nav {
  color: #ffffff;
  background: linear-gradient(to left, #80ff80, #8080ff);
}
nav a {
  background-color: inherit;
}
a {
  color: inherit;
  background-color: #e0e0ff;
}
li {
  /* 日本語と英語で高さが異なるので統一する
   * see https://coliss.com/articles/build-websites/operation/css/220.html
   */
  line-height: 137%;
}
.article {
  margin: 8px;
  background-color: #ffffff;
}
.level1 {
  color: #6060ff;
}
.level2 {
  color: #ff60c0;
}
.level3 {
  color: #00c000;
  font-weight: bold;
}
.level4 {
  color: #ff8080;
}
.level5 {
  color: #c080ff;
}
.level6 {
  color: #ff80ff;
  font-weight: bold;
}

ul {
  /* バレットと文章の間が無駄に広いので埋める */
  padding-inline-start: 1em; /* 1em == 100% */
}
`

const pagesHtml = head + `
<script src=pages.js></script>
<body>` + nav + `
<div class=article>
  <select id=sortby>
    <option value=last>Last Modified</option>
    <option value=random>Random Order</option>
  </select>
  <div class=article id=list />
</div>
</body>
</html>
`

const pagesJS = `
window.pages = [];
async function loadPages() {
  const res = await fetch("pages.json");
  const json = await res.json();
  window.pages = json;
  updateList();
}

const updateList = () => {
  const select = document.querySelector('#sortby');
  switch(select.value) {
    case 'last':
      pages.sort((a, b) => b.time - a.time);
      break;
    case 'random':
      for(let i = pages.length - 1; i > 0; i--) {
        const r = Math.floor(Math.random() * (i + 1));
        [pages[i], pages[r]] = [pages[r], pages[i]];
      }
      break;
  }
  const list = document.querySelector('#list');
  list.innerHTML = '<ul>' + pages.map((p) => '<li class=level1><a href=' + encodeURI(p.title) + '.html>' + p.title + '</a></li>').join('') + '</ul>';
};
window.addEventListener("DOMContentLoaded", (e) => {
  loadPages();
  const select = document.querySelector('#sortby');
  select.addEventListener("change", updateList);
});
`

var assets = map[string]string{
	"pages.html": pagesHtml,
	"pages.js":   pagesJS,
	"style.css":  css,
}

func writeAssets(dir string) error {
	for name, data := range assets {
		if err := ioutil.WriteFile(filepath.Join(dir, name), []byte(data), 0644); err != nil {
			return fmt.Errorf("asset write failed %s", err)
		}
	}
	return nil
}
