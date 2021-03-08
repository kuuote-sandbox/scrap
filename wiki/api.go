package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gorilla/mux"
)

func (h *WikiServer) HandleAPIPages(res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	projectName := vars["project"]
	log.Printf("request pages of %s from %s\n", projectName, req.RemoteAddr)
	project, ok := h.Projects[projectName]
	if !ok {
		res.WriteHeader(http.StatusNotFound)
		return
	}
	pages := project.PageList()
	res.Header().Add("Cache-Control", "no-store")
	res.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(res).Encode(&pages); err != nil {
		log.Printf("json encode error at %s\n", project.RootPath)
		fmt.Fprint(res, "[]")
	}
}

func servefile(res http.ResponseWriter, path string) {
	buf, err := ioutil.ReadFile(path)
	if err != nil {
		res.WriteHeader(http.StatusNotFound)
	} else {
		res.WriteHeader(http.StatusOK)
		res.Write(buf)
	}
}

func (h *WikiServer) HandleAPIPage(res http.ResponseWriter, req *http.Request) {
	vars := mux.Vars(req)
	projectName := vars["project"]
	page := vars["page"]
	log.Printf("request page %s/%s by %s from %s\n", projectName, page, req.Method, req.RemoteAddr)
	project, ok := h.Projects[projectName]
	if !ok {
		res.WriteHeader(http.StatusNotFound)
		return
	}

	file := filepath.Join(project.RootPath, page+".scp")
	switch req.Method {
	case http.MethodGet:
		sendPage(res, file)
	case http.MethodPut:
		buf, _ := ioutil.ReadAll(req.Body)
		fmt.Println(string(buf))
		var msg []Message
		if err := json.Unmarshal(buf, &msg); err != nil {
			res.WriteHeader(http.StatusBadRequest)
			fmt.Fprintf(res, "Invalid message %s\n", string(buf))
			fmt.Fprintf(res, "Error: %s\n", err)
		}
		ifMatch := req.Header.Get("If-Match")
		if err := receivePage(res, file, ifMatch, msg); err != nil {
			log.Println(err)
			return
		}
		info, err := os.Stat(file)
		if err == nil {
			project.ReadPage(info)
		}
	case http.MethodDelete:
		if err := os.Remove(file); err == nil {
			res.WriteHeader(http.StatusNoContent)
		} else {
			if os.IsNotExist(err) {
				res.WriteHeader(http.StatusNotFound)
			} else {
				res.WriteHeader(http.StatusForbidden)
			}
		}
	default:
		res.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (h *WikiServer) HandleAPIProjects(res http.ResponseWriter, req *http.Request) {
	log.Printf("request project from %s\n", req.RemoteAddr)
	var projects []string
	for name, _ := range h.Projects {
		projects = append(projects, name)
	}
	res.Header().Add("Cache-Control", "no-store")
	res.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(res).Encode(&projects); err != nil {
		log.Println("json encode error at projects")
		fmt.Fprint(res, "[]")
	}
}
