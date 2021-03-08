package scrap

import (
	"bufio"
	"os"
	"regexp"
	"strings"
)

var indentRegexp = regexp.MustCompile(`^\s+`)

// Text: outer Code or Link
// Code: `foobar`
// Link: [hogepiyo]
// re = Text | Code | Link
var textRegexp = regexp.MustCompile("[^\\[\\]`]+|`.+?`|\\[[^\\]]+?\\]")

func parseLine(line string) Line {
	indent := 0
	indentMatched := indentRegexp.FindStringIndex(line)
	if indentMatched != nil {
		indent = indentMatched[1]
	}
	text := textRegexp.FindAllString(line[indent:], -1)
	var nodes []Node
	for _, t := range text {
		node := Node{
			Type: Text,
			Text: t,
		}
		switch t[0] {
		case '`':
			node.Type = Code
		case '[':
			if strings.Contains(t, "://") {
				node.Type = URL
			} else {
				node.Type = Link
			}
		}
		if node.Type != Text {
			node.Text = node.Text[1 : len(node.Text)-1]
		}
		nodes = append(nodes, node)
	}
	return Line{
		IndentLevel: indent,
		Nodes:       nodes,
	}
}

func readLines(path string) ([]Line, error) {
	h, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	var lines []Line
	s := bufio.NewScanner(h)
	for s.Scan() {
		lines = append(lines, parseLine(s.Text()))
	}
	return lines, nil
}

// ParseURLNotation は Scrapbox みたいにいい感じに URL をパースしてくれるやつです
func ParseURLNotation(origin string) (url, text string) {
	s := strings.Split(origin, " ")
	var textbase []string
	for i := range s {
		if strings.Contains(s[i], "://") {
			url = s[i]
		} else {
			textbase = append(textbase, s[i])
		}
	}
	if len(textbase) == 0 {
		text = url
	} else {
		text = strings.Join(textbase, " ")
	}
	return
}
