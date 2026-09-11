# bellaMLX

bellaMLX is a desktop UI for local MLX inference on Apple Silicon, forked from vMLX. This fork's first milestone is reliable model loading, chat, settings, and persistence. The existing screen structure and Python package names remain in place. New inference capabilities and public distribution are deferred.

The desktop application is named **bellaMLX**, with application ID `app.bellamlx.desktop`. Its default macOS application data is `~/Library/Application Support/bellaMLX`. There is no automatic migration from upstream profiles. Upstream app-update checks are disabled.

## Development

Use Node 22 and Python 3.12 on Apple Silicon:

```sh
uv venv --python 3.12
uv pip install --python .venv/bin/python -e .
cd panel
npm ci
npm run dev
```

The Python CLI remains `vmlx-engine` and the Python import remains `vmlx_engine`. Model downloads are not required for deterministic UI tests.

See [development and testing](docs/DEVELOPMENT.md) for commands and fixture boundaries, and [correctness status](docs/CORRECTNESS.md) for coverage, reproduced defects, and remaining work.

## Attribution

This fork retains the upstream [license](LICENSE), Git history, and third-party license files. [Inherited notices](THIRD_PARTY_NOTICES.txt) preserve attribution-bearing upstream documentation. Original authorship metadata does not imply an upstream endorsement of bellaMLX.
