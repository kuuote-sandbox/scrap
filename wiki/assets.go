package main

import (
	"crypto/md5"
	"embed"
	"fmt"
	"net/http"
	"strings"
)

//go:embed assets
var assets embed.FS

type AssetHandler struct {
	Asset         embed.FS
	AssetPrefix   string
	HandlerPrefix string
}

func (a AssetHandler) ServeHTTP(res http.ResponseWriter, req *http.Request) {
	buf, err := a.Asset.ReadFile(a.AssetPrefix + strings.TrimPrefix(req.RequestURI, a.HandlerPrefix))
	if err != nil {
		fmt.Println("not found")
		res.WriteHeader(http.StatusNotFound)
		return
	}
	serverTag := fmt.Sprintf(`"%x"`, md5.Sum(buf))
	clientTag := req.Header.Get("If-None-Match")
	if serverTag == clientTag {
		fmt.Printf("use cache for %s\n", req.RequestURI)
		res.WriteHeader(http.StatusNotModified)
		return
	}
	fmt.Printf("send asset for %s\n", req.RequestURI)
	res.Header().Add("ETag", serverTag)
	res.WriteHeader(http.StatusOK)
	res.Write(buf)
}
