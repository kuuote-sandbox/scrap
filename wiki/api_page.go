package main

import (
	"bufio"
	"bytes"
	"crypto/md5"
	"fmt"
	"io/ioutil"
	"net/http"
)

type Message struct {
	Line    int    `json:"line"`
	Text    string `json:"text"`
	Action  string `json:"action"`
	Column  int    `json:"column"`
	Forward bool   `json:"forward"`
}

func md5sum(buf []byte) string {
	return fmt.Sprintf(`"%x"`, md5.Sum(buf))
}

func readPage(path string) (hash string, lines [][]rune) {
	buf, _ := ioutil.ReadFile(path) // 読めない時はbufが空になっていればいいのでエラーは無視
	hash = md5sum(buf)
	s := bufio.NewScanner(bytes.NewBuffer(buf))
	for s.Scan() {
		lines = append(lines, []rune(s.Text()))
	}
	// 1行もない状態だと編集ができないので空行を作る
	if len(lines) == 0 {
		lines = [][]rune{nil}
	}
	return
}

func writePage(path string, lines [][]rune) (hash string, err error) {
	var buf bytes.Buffer
	for _, l := range lines {
		fmt.Fprintln(&buf, string(l))
	}
	data := buf.Bytes()
	hash = md5sum(data)
	err = ioutil.WriteFile(path, data, 0644)
	return
}

func sendPage(res http.ResponseWriter, path string) {
	buf, _ := ioutil.ReadFile(path) // 読めない時は空になるのでエラーは捨てる
	res.Header().Add("Cache-Control", "no-store")
	res.Header().Add("ETag", md5sum(buf))
	res.WriteHeader(http.StatusOK)
	res.Write(buf)
}

// ifmatchは最初のページの未処理データと比較
// それが終わったらページをインデントと本文に分解する
// 編集動作を逐次実行し全てが終わったら新しいページのバイト列を生成、それを書き込んだ上でETagとして返す
func receivePage(res http.ResponseWriter, path string, ifMatch string, messages []Message) error {
	hash, lines := readPage(path)
	if ifMatch != hash {
		res.WriteHeader(http.StatusPreconditionFailed)
		return fmt.Errorf("received mismatch etag\nserver:%s\nclient:%s\n", hash, ifMatch)
	}
	for _, msg := range messages {
		switch msg.Action {
		case "add":
			t := lines[msg.Line]
			a := t[:msg.Column]
			b := []rune(msg.Text)
			c := t[msg.Column:]
			lines[msg.Line] = append(a, append(b, c...)...)
		case "change":
			lines[msg.Line] = []rune(msg.Text)
		case "delete":
			offset := -1
			if msg.Forward {
				offset = 0
			}
			t := lines[msg.Line]
			a := t[:msg.Column+offset]
			b := t[msg.Column+offset+1:]
			lines[msg.Line] = append(a, b...)
		case "join":
			lines[msg.Line] = append(lines[msg.Line], lines[msg.Line+1]...)
			lines = append(lines[:msg.Line+1], lines[msg.Line+2:]...)
		case "split":
			{
				nl := lines[msg.Line][msg.Column:]
				lines[msg.Line] = lines[msg.Line][:msg.Column]
				lines = append(lines[:msg.Line+1], append([][]rune{nl}, lines[msg.Line+1:]...)...)
			}
		}
	}
	var err error
	hash, err = writePage(path, lines)
	if err != nil {
		res.WriteHeader(http.StatusForbidden)
		return err
	}
	res.Header().Add("ETag", hash)
	res.WriteHeader(http.StatusNoContent)
	return nil
}
