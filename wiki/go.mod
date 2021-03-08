module github.com/kuuote/wiki

go 1.16

require (
	github.com/gorilla/mux v1.8.0
	github.com/kuuote/scrap v0.0.0-00010101000000-000000000000
	github.com/urfave/cli/v2 v2.2.0
)

replace github.com/kuuote/scrap => ../scrap
