package scrap

import (
	"fmt"
	"testing"
)

func compareNodes(a, b []Node) bool {
	if len(a) != len(b) {
		return false
	}
	for i, an := range a {
		if an != b[i] {
			return false
		}
	}
	return true
}

func TestParseLine(t *testing.T) {
	cases := []struct {
		line   string
		expect Line
	}{
		{
			"foo[b`a`r]baz`hoge[piyo]`",
			Line{
				0,
				[]Node{
					{Text, "foo"},
					{Link, "b`a`r"},
					{Text, "baz"},
					{Code, "hoge[piyo]"},
				},
			},
		},
		{
			"\tfoo bar",
			Line{
				1,
				[]Node{
					{Text, "foo bar"},
				},
			},
		},
		{
			"[https://example.org]",
			Line{
				0,
				[]Node{
					{URL, "https://example.org"},
				},
			},
		},
	}
	for _, c := range cases {
		parsed := parseLine(c.line)
		if parsed.IndentLevel != c.expect.IndentLevel || !compareNodes(parsed.Nodes, c.expect.Nodes) {
			t.Errorf("\nactual:%s\nexpect:%s\n", fmt.Sprint(parsed), fmt.Sprint(c.expect))
		}
	}
}

func TestParseURLNotation(t *testing.T) {
	cases := []struct {
		origin string
		url    string
		text   string
	}{
		{
			"ttp://test",
			"ttp://test",
			"ttp://test",
		},
		{
			"ttp://test test",
			"ttp://test",
			"test",
		},
		{
			"test ttp://test",
			"ttp://test",
			"test",
		},
		{
			"hoge fuga ttp://piyo",
			"ttp://piyo",
			"hoge fuga",
		},
		// 両方URLの場合は未定義動作としておく
	}
	for _, c := range cases {
		url, text := ParseURLNotation(c.origin)
		if url != c.url || text != c.text {
			t.Errorf("case %s\nactual:\n\tURL:  %s\n\tText: %s\nexpect:\n\tURL:  %s\n\tText: %s\n", c.origin, url, text, c.url, c.text)
		}
	}
}
