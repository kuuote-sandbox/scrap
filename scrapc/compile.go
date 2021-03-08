package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	urlpkg "net/url"
	"os"
	"path/filepath"

	"github.com/kuuote/scrap"
)

// Compile Scrap Wiki into HTML

func compilePage(page *scrap.Page, outdir string) error {
	h, err := os.Create(filepath.Join(outdir, page.Title+".html"))
	if err != nil {
		return err
	}
	defer h.Close()

	// Write Header
	fmt.Fprintln(h, head)

	// Write Body
	fmt.Fprintln(h, "<body>")

	// Navigation Bar
	fmt.Fprintln(h, nav)

	fmt.Fprintln(h, "<div class=article>")
	fmt.Fprintln(h, "<div class=article>")
	indentLevel := -1 // 最初と最後にulを入れるために初期インデントレベルは-1とする
	for _, l := range page.Lines {
		// インデントが深くなる分だけ<ul>を入れる
		for ; indentLevel < l.IndentLevel; indentLevel++ {
			fmt.Fprint(h, "<ul>")
		}
		// インデントが浅くなる分だけ</ul>を入れる
		for ; indentLevel > l.IndentLevel; indentLevel-- {
			fmt.Fprint(h, "</ul>")
		}
		fmt.Fprintf(h, "<li class=level%d>", indentLevel%6+1)
		for _, n := range l.Nodes {
			switch n.Type {
			case scrap.Link:
				fmt.Fprintf(h, "<a href=%s>%s</a>", urlpkg.PathEscape(n.Text+".html"), n.Text)
			case scrap.URL:
				url, text := scrap.ParseURLNotation(n.Text)
				text, _ = urlpkg.PathUnescape(text) // URL直接指定の場合のためデコードする
				fmt.Fprintf(h, "<a href=%s>%s</a>", url, text)
			default:
				fmt.Fprint(h, n.Text)
			}
		}
		fmt.Fprint(h, "</li>")
	}
	// 最後の行にはインデントレベル-1になるまで閉じの</ul>を入れる
	for ; indentLevel > -1; indentLevel-- {
		fmt.Fprintln(h, "</ul>")
	}
	fmt.Fprintln(h, "</div>")
	fmt.Fprintln(h, "</div>")

	fmt.Fprintln(h, "</body>")

	// Write Footer
	fmt.Fprintln(h, "</html>")
	return nil
}

func CompilePages(store scrap.DataStore, outdir string) error {
	// compile pages
	for _, page := range store.Pages {
		fmt.Printf("compile %s\n", page.Title)
		compilePage(page, outdir)
	}

	// and write assets
	// TODO: そのうちembedと入れ替える
	if err := writeAssets(outdir); err != nil {
		return err
	}

	// output page list
	pages := store.PageList()
	if buf, err := json.Marshal(&pages); err == nil {
		if err := ioutil.WriteFile(filepath.Join(outdir, "pages.json"), buf, 0644); err != nil {
			return err
		}
	}
	return nil
}
