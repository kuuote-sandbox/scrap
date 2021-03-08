package scrap

import (
	"fmt"
	"strconv"
	"testing"
)

func TestData(t *testing.T) {
	//ページ間のリンクが作れていることと読み直せること、またその際にリンクの追加削除がちゃんとされていることを検証する必要がある
	ds := NewDataStore("./testdata/linktest1")
	ds.ReadPages()
	ds.RootPath = "./testdata/linktest2"
	ds.ReadPages()
}

// ページ名はファイル名から `.scp` を取り除いたものを使う
// それ以外は一切ストアには含めない
func TestIgnoreExt(t *testing.T) {
	ds := NewDataStore("./testdata/ignore_ext")
	ds.ReadPages()
	fmt.Println(ds.Pages)
	expects := map[string]struct{}{
		"a": {},
		"b": {},
	}
	for _, name := range []string{"a", "a.scp", "b", "b.txt", "c"} {
		_, ok := ds.Pages[name]
		_, expect := expects[name]
		if expect != ok {
			t.Errorf("\nin page %s: actual %s, expect: %s\n", string(name), strconv.FormatBool(ok), strconv.FormatBool(expect))
		}
	}
}
