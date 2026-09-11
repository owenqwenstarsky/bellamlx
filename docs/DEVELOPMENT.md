# Development and testing

## Environment

Apple Silicon, macOS, Node 22, npm, and Python 3.12 are the verified development targets. Node 26 failed while compiling the inherited SQLite dependency and did not finish Electron's archive extraction correctly. Use Node 22; do not patch the native module or manually fabricate Electron installation metadata.

From the repository root:

```sh
uv venv --python 3.12
uv pip install --python .venv/bin/python -e .
cd panel
npm ci
npm run typecheck
npm test
npm run build:ui
npm run test:electron
```

`npm ci` rebuilds better-sqlite3 for Electron. Most unit tests mock Electron/native persistence; the Electron tests exercise the real native database. One retained upstream release-Python binding test is optional when the local `.venv` is absent. The rest of the UI checks do not require Python or models.

`npm run build:ui` compiles main, preload, and renderer. `npm run build` additionally bundles and verifies the Python runtime. `npm run dist` builds an unsigned directory package with publishing disabled. Full runtime bundling and public distribution are not milestone validation claims. The test-only main entry is excluded from packaged files.

## Test boundaries

Vitest retains existing unit tests and source contracts. `tests/components/*.test.tsx` uses jsdom, React Testing Library, and user-event with API fakes typed from `Window['api']`. These tests drive pending requests, failed reads/writes, out-of-order responses, Stop, retry, and navigation.

Playwright launches Electron with the real preload, chat/session/settings IPC handlers, and SQLite database. Its separate test entrypoint replaces model discovery and installation checks; it never ships in the app. A loopback HTTP fixture supplies deterministic model responses. Each test gets a temporary profile that is removed in `finally`. No model download or personal-profile access is needed. Screenshot and trace artifacts are written to `panel/test-results`; CI uploads failure artifacts and logs.

A passing fixture test is not proof of a particular MLX model's compatibility. Use the opt-in live test:

```sh
cd panel
BELLAMLX_SMOKE_MODEL_PATH=/absolute/path/to/model npm run test:electron -- live-model
```

Alternatively, build once, then run `BELLAMLX_SMOKE_MODEL_PATH=/absolute/path/to/model npx playwright test live-model`. The test copies the model to a temporary directory, disables Hugging Face network access, launches the real engine through session IPC, and stops its session during cleanup. This copy is required because the inherited engine can repair tensor alignment in-place. Never point ad-hoc engine probes at irreplaceable model files.

## Profiles and diagnosis

The default profile is independent of upstream. Existing `VMLX_USER_DATA_DIR` / `--vmlx-user-data-dir` test overrides remain supported for compatibility. Never point an automated test at a personal profile. Isolated live tests additionally enable `VMLX_ALLOW_SECONDARY_INSTANCE=1` and `VMLX_PROOF_OWNED_ENGINE_LIFECYCLE=1`, preventing adoption of unrelated engine processes.

PR CI runs independent unit/typecheck and Electron jobs. Inherited upstream release/signing/publishing workflows and their workflow-specific Python check were retired. No agent instruction files were added; none existed in the tracked checkout.

## Screenshot review

Baselines live in `panel/tests/electron/screens.spec.ts-snapshots`. They were visually reviewed on macOS 26.5.2. The fixture waits for bundled fonts, fixes device scale and viewport, disables animations, and moves the pointer away from controls. To intentionally update them, build the fixture and run `npx playwright test screens --update-snapshots`, then inspect each changed PNG before accepting it. CI never updates baselines automatically.
