package main

import (
	"log"
	"os"

	"github.com/urfave/cli/v2"
)

func run(c *cli.Context) error {
	server := NewWikiServer(c)
	return server.Run()
}

func main() {
	app := cli.NewApp()
	app.Name = "wiki"
	app.Usage = "Wiki service"
	app.Version = "0.0.0"
	app.Flags = []cli.Flag{
		&cli.IntFlag{
			Name:    "port",
			Aliases: []string{"p"},
			Value:   1029,
		},
		&cli.StringFlag{
			Name:    "config",
			Aliases: []string{"c"},
			Value:   "./projects.json",
		},
	}
	app.Action = run
	err := app.Run(os.Args)
	if err != nil {
		log.Fatal(err)
	}
}
