## Graphify

- Before structural extraction on full builds and updates, run `"$(cat graphify-out/.graphify_python)" scripts/graphify-gtfs.py` from the repository root using the interpreter selected by the Graphify skill. This indexes `data/gtfs/mappings.json` as a file so its TypeScript import resolves, including after a mappings change or a cache reset.
