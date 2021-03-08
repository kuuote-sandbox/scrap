package main

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/kuuote/scrap"
	"github.com/urfave/cli/v2"
)

type WikiServer struct {
	Router     *mux.Router
	HTTPServer *http.Server
	Projects   map[string]scrap.DataStore
}

func NewWikiServer(c *cli.Context) *WikiServer {
	projects, err := scrap.ReadProjects(c.String("config"))
	if err != nil {
		panic(err)
	}
	r := mux.NewRouter()
	server := &WikiServer{
		Router: r,
		HTTPServer: &http.Server{
			Addr: ":" + strconv.Itoa(c.Int("port")),
		},
		Projects: projects,
	}
	server.HTTPServer.Handler = r
	r.PathPrefix("/assets/").Handler(AssetHandler{
		Asset:         assets,
		AssetPrefix:   "assets",
		HandlerPrefix: "/assets",
	})
	r.HandleFunc("/api/page/{project}", server.HandleAPIPages)
	r.HandleFunc("/api/page/{project}/{page}", server.HandleAPIPage)
	r.HandleFunc("/api/projects", server.HandleAPIProjects)
	r.HandleFunc("/exit/", server.HandleExit)
	r.PathPrefix("/wiki").HandlerFunc(server.HandleWiki)

	return server
}

func (s *WikiServer) PendingShutdown() {
	go func() {
		// ちゃんとレスポンス返してほしいのでGraceful Shutdownをする
		// ゴルーチンの中で呼ばないとだめぽ
		context, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		s.HTTPServer.Shutdown(context)
	}()
}

func (h *WikiServer) HandleExit(res http.ResponseWriter, req *http.Request) {
	res.WriteHeader(http.StatusOK)
	fmt.Fprintln(res, "pending exit")
	h.PendingShutdown()
}

func (h *WikiServer) HandleWiki(res http.ResponseWriter, req *http.Request) {
	buf, err := assets.ReadFile("assets/page.html")
	if err != nil {
		res.WriteHeader(http.StatusInternalServerError)
		return
	}
	res.WriteHeader(http.StatusOK)
	res.Write(buf)
}

// h.Projectsを列挙

func (h *WikiServer) Run() error {
	fmt.Printf("start at %s\n", h.HTTPServer.Addr)
	return h.HTTPServer.ListenAndServe()
}
