package main

import (
	"fmt"
	"os"

	"github.com/kuuote/scrap"
)

func main() {
	if len(os.Args) != 3 {
		fmt.Printf("usage: %s in out\n", os.Args[0])
		return
	}
	in := os.Args[1]
	out := os.Args[2]
	ds := scrap.NewDataStore(in)
	ds.ReadPages()
	CompilePages(ds, out)
	fmt.Println("done")
}
