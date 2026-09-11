# Known issues

This is the active issue tracker. We use pull requests, not GitHub Issues. An entry proposed on a branch becomes an accepted issue when merged into `main`. Read [AGENTS.md](AGENTS.md) for reporting, fixing, verification, and archival rules. Resolved records live in [.github/PAST_ISSUES.md](.github/PAST_ISSUES.md).

## UI audit coverage

Exploratory UI audit conducted 2026-09-11 on checkout `7ded33ad`, macOS Electron development app at `localhost:5173`, displayed version 1.6.57. Findings were observed through Computer Use, not inferred from application source. The initial profile contained one saved conversation, no configured sessions, and eleven discovered local models. Paths are omitted where unnecessary for reproduction. This is an exploratory audit, not a guarantee that every possible defect has been found.

| Surface | Exercised through the UI | Result / limits |
| --- | --- | --- |
| Chat with missing session | Saved history, Load Model, edit open/cancel, reasoning expand/restore | KI-0001; Escape cancels editing without changing the original message |
| Local session lifecycle | New chat → choose Qwen3-1.7B-4bit → launch; Stop; Load Model restart; Stop again | Launch and restart succeeded; stopped composer disabled; history retained |
| Live chat | Whitespace composer, basic generation, long generation and Stop, whitespace edit, valid edit/resend | Main composer rejects whitespace; Stop produced “[Generation interrupted]”; valid replacement generated a response; KI-0007 and KI-0008 |
| Chat settings | Read server information and inference/tool settings; out-of-range frequency penalty; negative Max Tokens save/reopen | Penalty rejected 99; -1 Max Tokens normalized back to the default on reopening; tools remained disabled |
| Chat navigation/layout | Search with no matches, Escape dismissal; smaller window and restored size | Clear empty search state; navigation/composer stayed accessible; no claim of a complete accessibility audit |
| Servers | Empty state; local model chooser; advanced configuration; port bounds; generation disclosure; remote connection form | KI-0006; empty remote fields disabled Connect; no remote credentials supplied or external endpoint connected |
| API | Gateway empty state, endpoints, manual integration setup | Read-only inspection; no tool install, auto-configuration, LAN, or security changes |
| Models/library | Discovered models and tool navigation | Read-only inventory; no model deletion |
| Inspector/Doctor | Missing absolute path; Doctor without inference; verbose output | KI-0002 and KI-0003 |
| Converter | JANG/MLX Uniform profiles and custom controls; navigation from failed Doctor | KI-0005; no conversion or overwrite performed |
| Download discovery | Text no-result search; image discovery; README details; Downloads empty window and return | KI-0004 and KI-0010; no large weight transfer started |
| Image workspace | Missing folder, advanced override disclosure, detected local Flux bundle, startup, logs/settings after failure, return to chooser | Missing folder correctly disables Load; detected Flux Schnell/generate/Flux1 and stored 4-bit precision; KI-0009 |
| Preferences | Language choices, key fields, about/version and links inspected | No credentials entered, keys saved, or language preference changed |

### Environment limits and retained audit state

Image startup failed with a clear `ImportError: mflux not installed` message. Successful image generation, editing/masks, and generation-history operations could not be exercised in this environment without installing the missing dependency; no installation or fix was attempted. Actual download completion/cancellation/resume, full conversion, microphone/media capture, destructive deletion, external credentials/integrations, and exhaustive model compatibility were not exercised. These are coverage limits, not presumed defects or passing tests.

One new audit chat and its configured Qwen3-1.7B-4bit session remain in the profile for reproduction. The model was stopped after testing, and the original chat was not edited or deleted. The audit chat contains the hello prompt and a successfully edited arithmetic prompt. The interrupted lighthouse generation was replaced through the tested edit/resend flow. No app source was changed. Early Computer Use window-targeting errors were excluded from the findings as tooling errors.

## KI-0001 — Load Model provides no recovery for a saved chat without a session

- **Status:** Open (proposed until merged into main)
- **Severity:** P2 — blocks resuming the affected conversation through the offered action.
- **Area:** Chat / missing-session recovery
- **Observed:** 2026-09-11, audit environment above; reproduced twice after successful navigation established that Computer Use was targeting the app.
- **Preconditions:** A saved conversation remains in history, but Servers lists no sessions. Chat shows “No models configured.” and “Model is not running.” The audited conversation title was `Chat with c1899de289a04d12100db370d81485cdf75e47ca`.
- **Steps:** Open the saved conversation under Chat & Images → Chat. Click the enabled green **Load Model** button above the disabled composer. Click it again after the UI settles.
- **Actual:** The view remains unchanged, the composer stays disabled, and no error, session chooser, or recovery instructions appear.
- **Expected:** Offer a working way to associate/load a session, or clearly explain the missing session and route the user to configuration. Do not present an enabled action that silently does nothing.
- **Workaround:** The top bar offers Add local model / Connect Remote. Whether creating a replacement session reconnects this existing conversation has not been verified. Load Model did successfully restart the separate audit chat after its configured session was stopped; the confirmed failure is scoped to the absent-session case.
- **Fix verification:** Reproduce with a retained conversation whose session is absent, then verify the action gives explicit recovery and enables continuing the conversation after a suitable session is selected. Also check a configured but stopped session still loads normally.
- **Scope / uncertainty:** The missing-session state was already present; the operation that produced it was not observed. No root cause is established.

## KI-0002 — Model Inspector hides the reason an invalid local path fails

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — recoverable error with insufficient guidance.
- **Area:** Models → Library & tools → Inspect Model
- **Observed:** 2026-09-11, audit environment above; accessibility output and screenshot both showed the final error.
- **Steps:** Open Inspect Model. Enter `/definitely-missing-ui-audit-model` in Model Path or HuggingFace ID. Click Inspect and wait for the input and button to re-enable.
- **Actual:** The only error is “Command failed”. There is no explanation that the folder is missing or instruction for correcting the input.
- **Expected:** Identify an invalid/missing local folder with actionable feedback. Other failures should distinguish invalid input from an unavailable inspector/runtime where possible.
- **Workaround:** Check the folder manually and choose a known model path; the UI does allow retrying.
- **Fix verification:** Repeat with a nonexistent absolute path and verify a useful error, then inspect a valid local model. Check malformed remote IDs and unavailable remote metadata separately without mislabeling those failures as missing local folders.
- **Scope / uncertainty:** Only the visible error quality is confirmed. The underlying command failure was not investigated in code and is not attributed to a particular backend cause.

## KI-0003 — Model Doctor hides a failed diagnosis inside collapsed verbose output

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — users cannot tell whether diagnostics failed without inspecting optional detail.
- **Area:** Models → Library & tools → Diagnose Model
- **Observed:** 2026-09-11, audit environment above; final screen checked visually and with accessibility output.
- **Steps:** Open Diagnose Model. Enter `/definitely-missing-ui-audit-model`, leave Include inference test unchecked, and click Run Diagnostics. Wait until the button becomes available again.
- **Actual:** The only result on the screen is a collapsed “VERBOSE OUTPUT (6 LINES)” section. There is no visible failure summary. Expanding that section reveals “Error: Model not found locally” and instructions to download the nonexistent absolute path as though it were a repository ID.
- **Expected:** Display a clear failure summary outside optional verbose output, identify the missing local directory, and offer guidance appropriate to a local path. Keep detailed logs available separately.
- **Workaround:** Expand VERBOSE OUTPUT to discover the failure; correct the local directory path rather than following the suggested download command.
- **Fix verification:** Run diagnostics against a missing absolute path and verify the failure is immediately visible with useful local-path guidance. Check successful diagnosis and malformed remote-ID errors retain distinct summaries.
- **Scope / uncertainty:** No inference test was run, and no model weights were modified. This is distinct from KI-0002 because diagnosis has a useful error in its output but hides it by default.

## KI-0004 — Downloads empty state points to outdated navigation

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — minor navigation/documentation mismatch.
- **Area:** Models → Find & download → View Downloads
- **Observed:** 2026-09-11, audit environment above; downloads window checked visually and with accessibility output.
- **Preconditions:** No active downloads.
- **Steps:** Open Models → Find & download, then View Downloads.
- **Actual:** The empty window says “Downloads from the Image or Server tab appear here”. It does not name Models → Find & download, the dedicated page from which the window was opened.
- **Expected:** Empty-state guidance names the current download navigation, including Models → Find & download, so users know where to initiate a download.
- **Workaround:** Close the Downloads window and use the Models page that remains open behind it.
- **Fix verification:** Open an empty Downloads window from the download page and verify the guidance matches the current navigation. Check any other supported download entry points are described accurately.
- **Scope / uncertainty:** No download was started; this finding concerns navigation wording, not download functionality.

## KI-0005 — Converter reports a failure from an unrelated diagnosis

- **Status:** Open (proposed until merged into main)
- **Severity:** P2 — tool results are attributed to the wrong operation, making the displayed outcome unreliable.
- **Area:** Models → Library & tools, navigation between Model Doctor and Model Converter
- **Observed:** 2026-09-11, audit environment above; confirmed in accessibility output and a screenshot of the converter's lower section.
- **Steps:** Run Model Doctor on `/definitely-missing-ui-audit-model` without inference. Wait for completion and expand VERBOSE OUTPUT. Click Back, then Convert Model. Leave Source Model empty and scroll to the bottom.
- **Actual:** The converter shows a red “Conversion failed” result and the six diagnosis log lines (including “Examining:” and “Model not found locally”). No conversion was requested. The conversion button is disabled because the source is empty. Switching between JANG and MLX Uniform retains the unrelated result.
- **Expected:** Only show conversion results for a conversion that was actually requested. A prior diagnosis must not become a conversion failure when navigating between tools.
- **Workaround:** Treat the displayed conversion result as stale after this navigation sequence. No reliable UI reset workaround has been verified.
- **Fix verification:** Follow the sequence above and confirm a new converter has no result. Repeat tool navigation after both successful and failed operations, checking that each result remains associated with its actual operation and model.
- **Scope / uncertainty:** No conversion was run and no output files were created. The finding is based on displayed state, not an inferred implementation cause.

## KI-0006 — Session port field accepts values above its slider maximum without feedback

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — inconsistent form state and missing inline guidance for invalid input.
- **Area:** Servers & API → Server → Create Session → local model → Server Settings
- **Observed:** 2026-09-11, audit environment above; reproduced twice using `mlx-community/Qwen3-1.7B-4bit` selected from the discovered list.
- **Steps:** In the configuration form, replace Port with `99999`, then press Tab.
- **Actual:** The numeric field retains `99999`, while the adjacent slider reports `65535` and sits at its maximum. No validation message appears and Launch Session remains enabled. By comparison, entering `-1` clamps both controls to `1024` on blur.
- **Expected:** Keep the slider and numeric field consistent. Reject or clamp values outside the supported range and explain invalid input before launch.
- **Workaround:** Enter a port within the supported slider range; `8000` restored both controls consistently during the audit.
- **Fix verification:** Check values below the minimum, at each boundary, above 65535, empty input, decimals, and pasted input. Both controls must agree after blur, with explicit feedback or consistent normalization for invalid values.
- **Scope / uncertainty:** Launch was not attempted with an invalid port. This report does not claim the backend accepts invalid ports or that a server started. The field was restored to 8000 and no session was launched from that advanced form. A later, separate New chat flow successfully launched the model with detected defaults.

## KI-0007 — New chat titles use cache snapshot hashes instead of model names

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — history entries are difficult to identify and distinguish.
- **Area:** Chat sidebar / new local-model conversation
- **Observed:** 2026-09-11, same development app; a new audit conversation was created through the UI.
- **Steps:** With no sessions configured, click New chat. Select the discovered `mlx-community/Qwen3-1.7B-4bit` model stored under a Hugging Face `snapshots/<hash>` directory, then Launch Session. Inspect the sidebar after loading and after sending a message.
- **Actual:** The selector shows `mlx-community/Qwen3-1.7B-4bit`, but the sidebar title is `Chat with 3b1b1768f8f8cf8351c712464f906e86c2b8269e`, truncated to an opaque prefix. Sending messages does not replace it with a readable name in the observed session.
- **Expected:** Use the available human-readable model name or a meaningful conversation title rather than an implementation-specific snapshot directory name.
- **Workaround:** Identify the conversation by opening it and checking its messages/model selector. Manual renaming has not been verified.
- **Fix verification:** Create chats for at least two models discovered in snapshot directories and verify readable, distinguishable history titles; also check ordinary model directory paths.
- **Scope / uncertainty:** The existing earlier chat also had a hash title, but its creation was not observed. The newly created audit chat establishes this reproduction independently.

## KI-0008 — Whitespace-only message edits leave an enabled Send button that silently does nothing

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — inconsistent validation and missing feedback in the edit form.
- **Area:** Chat → Edit & resend
- **Observed:** 2026-09-11, running `mlx-community/Qwen3-1.7B-4bit` audit session.
- **Steps:** Send a message in a test conversation. Open Edit & resend for that message, replace its contents with three spaces, and click Send.
- **Actual:** Send remains enabled. Clicking it leaves the edit form unchanged and shows no validation error. In contrast, the main composer disables Send when it contains only spaces.
- **Expected:** Disable Send for an empty/whitespace-only edit, or explain why it cannot be submitted. Preserve the original message until a valid edit succeeds.
- **Workaround:** Enter non-whitespace text or Cancel/Escape. A valid replacement prompt sent successfully in the audit.
- **Fix verification:** Compare empty, whitespace-only, and valid inputs in the composer and edit form, including keyboard submission. Invalid edits must not alter the original conversation and must give a clear disabled state or validation message.
- **Scope / uncertainty:** No message loss was observed; this is a validation/feedback issue rather than a claim of data loss.

## KI-0009 — Image Settings remains enabled but does nothing after startup fails

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — an available control gives no feedback or recovery in an error state.
- **Area:** Chat & Images → Image → failed model startup
- **Observed:** 2026-09-11, same app, with the locally discovered `FLUX.1-schnell-mflux-4bit` bundle.
- **Steps:** Select the local image folder and Load selected folder in an environment without mflux. Wait for the visible error “Process exited before becoming ready: ImportError: mflux not installed. Install with: pip install mflux”. Click Settings in the image toolbar.
- **Actual:** Settings is enabled, but clicking it twice produces no panel, dialog, explanation, or other visible change. Logs can be toggled and the model chooser opens, establishing that adjacent controls respond.
- **Expected:** Open settings that are useful before startup, or disable the control and explain its prerequisite. If startup failed, offer a clear recovery route instead of a silent action.
- **Workaround:** Use the model-name/folder control to return to the chooser. This does not resolve the missing runtime dependency.
- **Fix verification:** Exercise Settings during startup, after startup failure, after stopping, and while running. Every enabled state must have a visible effect; unavailable states should explain why.
- **Scope / uncertainty:** Missing mflux is an environment limitation, not itself the UI defect reported here. Successful image generation was not tested and no dependency was installed.

## KI-0010 — Model README tables display as raw Markdown rather than a readable table

- **Status:** Open (proposed until merged into main)
- **Severity:** P3 — model comparisons are difficult to scan, especially in the narrow details pane.
- **Area:** Models → Find & download → model README pane
- **Observed:** 2026-09-11, same app; accessibility output and screenshot of the details pane agreed.
- **Steps:** Open Image → Find mflux models (or Models → Find & download → Image). Select the `npario/Qwen-Image-Edit-mflux` result. Inspect its “Available quantizations” section in the README pane.
- **Actual:** The table is shown as lines such as `| Variant | Folder | Size |`, a separator made of dashes, and pipe-delimited rows. Headings and links elsewhere in the same README are rendered. The comparison wraps in the narrow pane instead of aligning columns.
- **Expected:** Render supported Markdown tables as aligned tables, with horizontal scrolling if necessary, while retaining safe link/content handling.
- **Workaround:** Open the model's Hugging Face page using its external-link button to read the original README (the external page was not verified in this audit).
- **Fix verification:** View a README containing a valid header/separator/body Markdown table, long cells, and inline code. Verify aligned columns, readable overflow, and continued rendering of headings and links. Use a stable fixture because public README contents may change.
- **Scope / uncertainty:** This report is about the app's observed rendering of this README, not a claim that all Markdown features or every model README fail.
