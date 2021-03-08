package scrap

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	Text = iota
	Code
	Link
	URL // Sub type of Link
)

type Node struct {
	Type int
	Text string
}

type Line struct {
	IndentLevel int
	Nodes       []Node
}

type DataStore struct {
	RootPath string
	Pages    map[string]*Page
}

type Page struct {
	Title     string
	ModTime   time.Time
	Lines     []Line
	Links     map[string]struct{}
	FromLinks map[string]struct{}
}

type PageInfo struct {
	Title   string `json:"title"`
	ModTime int64  `json:"time"`
}

func NewDataStore(rootPath string) DataStore {
	return DataStore{
		RootPath: rootPath,
		Pages:    make(map[string]*Page),
	}
}

func (s *DataStore) GetOrCreatePage(title string) *Page {
	page, ok := s.Pages[title]
	if !ok {
		page = &Page{
			Title:     title,
			Links:     make(map[string]struct{}),
			FromLinks: make(map[string]struct{}),
		}
		s.Pages[title] = page
	}
	return page
}

func (s *DataStore) resolveLink(page *Page, lines []Line) {
	for link := range page.Links {
		target := s.GetOrCreatePage(link)
		delete(page.Links, link)
		delete(target.FromLinks, page.Title)
	}
	for _, l := range lines {
		for _, n := range l.Nodes {
			if n.Type == Link {
				page.Links[n.Text] = struct{}{}
				target := s.GetOrCreatePage(n.Text)
				target.FromLinks[page.Title] = struct{}{}
			}
		}
	}
}

func (s *DataStore) ReadPage(info os.FileInfo) error {
	title := strings.TrimSuffix(info.Name(), ".scp")
	path := filepath.Join(s.RootPath, info.Name())
	modTime := info.ModTime()
	lines, err := readLines(path)
	if err != nil {
		return err
	}
	page := s.GetOrCreatePage(title)
	page.Lines = lines
	page.ModTime = modTime
	s.resolveLink(page, lines)
	return nil
}

func (s *DataStore) ReadPages() error {
	es, err := ioutil.ReadDir(s.RootPath)
	if err != nil {
		return fmt.Errorf("can't read data directory: %s", s.RootPath)
	}
	for _, e := range es {
		if !strings.HasSuffix(e.Name(), ".scp") {
			continue
		}
		if err := s.ReadPage(e); err != nil {
			return fmt.Errorf("can't read page file: %s", e.Name())
		}
	}
	return nil
}

func (s *DataStore) PageList() []PageInfo {
	pages := []PageInfo{}
	var zero time.Time
	for _, p := range s.Pages {
		if p.ModTime == zero {
			continue
		}
		pi := PageInfo{
			Title:   p.Title,
			ModTime: p.ModTime.Unix(),
		}
		pages = append(pages, pi)
	}
	return pages
}
