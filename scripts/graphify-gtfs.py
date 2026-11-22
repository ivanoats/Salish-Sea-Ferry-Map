"""Index the GTFS mappings as one file before Graphify's structural extraction."""

from pathlib import Path

from graphify.cache import save_cached
from graphify.rcfile import cache_salt


def index_mappings(root: Path) -> None:
    relative_path = Path("data/gtfs/mappings.json")
    mappings = root / relative_path
    if not mappings.is_file():
        raise FileNotFoundError(mappings)

    # Graphify skips top-level JSON arrays. The TypeScript extractor already
    # emits the import edge, so only its file-level target needs to be supplied.
    node = {
        "id": "data_gtfs_mappings",
        "label": mappings.name,
        "file_type": "code",
        "source_file": relative_path.as_posix(),
        "source_location": "L1",
    }
    save_cached(mappings, {"nodes": [node], "edges": []}, root, salt=cache_salt(mappings))


if __name__ == "__main__":
    index_mappings(Path(__file__).resolve().parents[1])
