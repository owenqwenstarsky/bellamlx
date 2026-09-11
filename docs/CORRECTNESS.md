# UI correctness baseline

Recorded September 11, 2026, against the working tree based on `b3e0a512`. This is a regression foundation for existing workflows, not a new inference capability or a large-model readiness decision.

## Verification

- Node 22: **197 Vitest files passed; 3,851 tests passed and 3 inherited tests skipped**.
- TypeScript: application code plus the new component/Electron tests pass `npm run typecheck`.
- Main, preload, and renderer compile with `npm run build:ui`.
- Electron: **all four journeys passed** in the final run, including the opt-in live-model test. Deterministic tests use real preload, chat/session/settings IPC, native SQLite, loopback inference fixture, isolated temporary profiles, and process restart. Covers streaming, cancellation, backend errors, recovery, conversation switching during generation, deleted-session isolation, saved history, preference persistence, and interrupted-load status/PID reconciliation after restart.
- Five reviewed screenshot baselines use bundled IBM Plex Mono, a fixed 1100×760 viewport, scale factor 1, and neutral pointer position. Preferences are also checked at 800×600; the desktop now enforces that minimum. Language picker Escape dismissal restores keyboard focus.
- The app identity is `bellaMLX` / `app.bellamlx.desktop`. Bootstrap tests verify isolated default data before database imports. No automatic upstream-profile migration or startup process adoption is performed. The app-update checker schedules no request or timer.
- Electron-builder configuration is validated in the retained packaging tests. Development packaging disables signing, notarization, update metadata, and publishing hooks. Python source packaging includes its README; licenses/notices are included. Public distribution and full bundled-runtime packaging remain deferred.

The untouched source snapshot initially produced 10 failing Vitest files (11 failed assertions, plus an Electron import failure), with 181 passing files. Dependencies were initially absent. Node 26 also failed native compilation and Electron extraction. After installing with Node 22, stale source contracts were corrected for moved controls, timeout selection, dynamic translation keys, and owned-process shutdown. Upstream release-only confinement/workflow checks were retired with the release workflows; runtime and other useful packaging tests remain. Baseline and subsequent command output were captured in `/tmp/bellamlx-*.log` during this run.

## Reproduced defects and regression coverage

Severity: high means a wrong-session action or blocked core journey; medium means misleading state or recoverable UI failure.

| Defect and reproduction | Expected / previous actual | Severity | Fix and coverage |
| --- | --- | --- | --- |
| Reject the initial single-model preference read, then retry. | A recoverable error; previously the disabled switch had no retry path. | Medium | Retry UI, stale-error guard; `single-model-preference.test.tsx`. |
| Broadcast a new applied preference while an old read/write is pending. | Show the latest applied value; a late rejected read could show an obsolete error. | Medium | Revision checks, pending write disable, failure/retry coverage. |
| Delay `sessions.list`, then stop the model before that response arrives. | Remain stopped; previously the list could restore loading/running. | High | Request ordering and lifecycle-event reconciliation; `session-events.test.tsx`. |
| Start the same model twice, or emit ready before start IPC resolves. | One start, immediate completion; previously duplicate creates/starts or a five-minute wait were possible. | High | Shared pending operation and subscriptions before start; rendered provider tests. |
| Stop a pending load while its start reply is delayed. | Settle the caller and permit retry; previously it could wait for timeout. | High | Ready/error/stop race and listener cleanup; both loading and stopped initial states tested. |
| Request a standby model after the lifecycle refactor. | Wake the existing engine; pre-commit review found the refactor returned without waking it. | High | Restored wake IPC, propagate wake failures and permit retry; `session-events.test.tsx`. |
| Change a chat's model, navigate away, then resolve the original save; also reject a save. | Stay in the current chat and apply only saved selections; previously a late reply reopened the old chat or an unsuccessful save still changed the active model. | High | Navigation/revision guards; `chat-session-binding.test.tsx`. |
| Select model B, then deliver model A's delayed session details. | B's settings remain bound to B; previously the old detail ID could reach the settings drawer. | High | Cancel stale hydration and require matching detail/session identity; `toolbar-settings-race.test.tsx`. |
| Delete the active model session while another model is running. | Keep the conversation unbound until explicit selection; previously App silently selected the other model. | High | Removed automatic rebinding; real Electron chat test checks disabled composer and unchanged selection. |
| Open the language picker with the keyboard, then press Escape. | Dismiss and return focus; previously Escape did nothing. | Medium | Escape handling, expanded state and accessible name; Electron screen test. |

Existing unit coverage remains for backend session failures/retries, stopped-session reconciliation, chat stream errors/terminal events, cancellation, settings reset/compatibility, and SQLite migration/persistence contracts. New rendered tests supplement those contracts instead of replacing them wholesale.

## Apple Silicon smoke

Hardware: Apple M5, 24 GiB RAM; macOS 26.5.2. The user authorized looking only in the Hugging Face model cache.

Model: `mlx-community/Qwen3.5-0.8B-MLX-4bit`, snapshot `5d894f8cc4ef3e6c88537bf3746ed262f549da6a`. The opt-in test receives an explicit path, copies the snapshot to a temporary directory, and disables Hub/Transformers network access. It creates and starts a local session through the real IPC/session manager, sends chat text through the rendered composer, cancels a second turn, waits for a completed follow-up, stops and restarts the engine, reloads the renderer, and checks saved messages. The final run passed in 21.2 seconds (26.6 seconds for all four Electron tests). The restored original model blob was independently verified as SHA-256 `f5a0d9dd3efa73510542a8023d610ff26be2b4b020d181cfc4bedaa1fcc5dd9e`.

The first ad-hoc loader invocation repaired alignment in the cache snapshot before the side effect was discovered. The original content-addressed blob was preserved. The snapshot's original symlink was restored, and its generated lock was removed. Subsequent smoke runs operate only on disposable copies; no model was downloaded.

## Screen inventory and remaining work

### Updating screenshot baselines

Electron screenshots are scoped to the macOS major version (`*-darwin-macos-14.png`
for the `macos-14` CI runner, `*-darwin-macos-26.png` for macOS 26). CoreText and
emoji rendering differ between OS releases even when the UI uses bundled fonts;
sharing one Darwin baseline caused a 6,330-pixel mismatch on the empty chat screen.
Pixel comparison tolerances remain at Playwright's defaults.

Run `npm run test:electron` from `panel` to verify the current OS baselines. For an
intentional visual change, build with `npm run build:ui && node tests/electron/build.mjs`,
then run `npx playwright test screens.spec.ts --update-snapshots` on each supported
macOS version. Review all five images and commit the updated baselines, then rerun
without `--update-snapshots`. A new OS major version requires its own reviewed set;
do not copy another OS's images or increase the pixel tolerance to make it pass.

| Surface | Current coverage / next step |
| --- | --- |
| First-run setup | Real renderer smoke with controlled installation detection; installer/download execution is excluded. |
| Chat/history/model picker | Deterministic success, stream, cancel, error, retry, navigation, deletion, restart, and live small-model smoke. Add richer multi-turn tool/media fixtures incrementally. |
| Servers: dashboard, create, detail, configuration, cache, performance, logs | Empty-screen baseline plus lifecycle component/backend coverage and real local start/stop/restart. Broaden rendered configuration save/reset matrices. |
| Preferences and settings drawers | Applied-value races, persistence, model-bound drawer hydration, language keyboard dismissal, minimum layout. Broaden credential failure feedback and keyboard/focus coverage across all drawers. |
| API gateway/client configuration | Existing unit/behavioral tests retained. Add rendered API screen snapshots. |
| Models: library, inspector, doctor, converter, find/download | Library baseline and existing discovery/download tests. Real conversion and network download journeys are outside deterministic smoke. |
| Image studio/history | Existing image tests retained; no live image model was run. Add isolated image fixtures before claiming complete visual regression coverage. |
| Code placeholder and advanced tool/distributed panels | Existing structure retained. No new feature or capability work. |

No known high-severity defect remains in the exercised core journeys. This does not establish exhaustive coverage of every inherited screen, model family, failure mode, or operating-system version. CI was configured but was not executed on GitHub during this local task. Full signed distribution, Python package renaming, broader accessibility review, and large-model experimentation require later work; large-model readiness remains a separate user decision.
