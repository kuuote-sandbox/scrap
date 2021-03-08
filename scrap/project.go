package scrap

import (
	"encoding/json"
	"os"
)

func ReadProjects(configFile string) (map[string]DataStore, error) {
	var defs map[string]string
	projects := make(map[string]DataStore)
	h, err := os.Open(configFile)
	if err != nil {
		return nil, err
	}
	defer h.Close()
	if err := json.NewDecoder(h).Decode(&defs); err != nil {
		return nil, err
	}
	for name, path := range defs {
		data := NewDataStore(path)
		if err := data.ReadPages(); err != nil {
			return nil, err
		}
		projects[name] = data
	}
	return projects, nil
}
