# Candidate intake: auto name, PDF upload with mandatory line confirmation

## Context
Two intake improvements on `/candidates/new`, plus the standing branch rule.

**Branch state.** The current branch is already `main`. HEAD includes every change from `github/main` (`bbfde74`, including the workspace-scoping review fixes) unchanged, with the approved landing and redesign work on top. Git mutations such as pull, reset, merge and checkout are framework-managed and rejected in this workspace, so no reset was performed and nothing on main that I did not write was reverted. The workspace-scoping fix in `save-review` remains intact and is not touched.

**1. Auto-extract the candidate name.** When resume text is present, a user-initiated action calls a new edge function that reads the candidate name from the text and prefills the name field, leaving it editable. The function copies protocol handling, the auth scheme ladder, URL normalisation, CORS, and JSON extraction from `generate-criteria` exactly. No model call ever runs on page load or mount; the trigger is always a reviewer action, honoring the hard invariant.

**2. PDF upload.** Upload one or more `.pdf` or `.txt` files. Text is extracted in the browser, one file at a time, with per-file progress. After extraction the reviewer always sees the numbered lines and must edit, merge, split, or delete them and confirm before anything is saved. Extraction that is empty (scanned image, no text layer), very thin, or fragmented is clearly warned about, with the paste path offered instead. The existing paste-text path keeps working exactly as it is today.

## Approach

### New edge function `supabase/functions/extract-candidate-name/index.ts`
Copy `generate-criteria` structure verbatim for: `cors`, `json`, `extractJson`, protocol resolution, URL normalisation, `authHeaders`, `extraHeaders`, `postModel`, `readContent`, `callModel`, and the `Deno.serve` handler shape. Only the request body, prompt, and response shaping differ:
- Request body: `{ resumeText: string }`.
- Prompt: return the candidate's full name as it appears at the top of the resume; return `null` when no name is present.
- Output JSON: `{"name": string | null}`.
- Shaping: trim the name, cap length, empty string when unusable.
- Deploy with `supabase_deploy_edge_function` (load `enter_cloud` first for conventions).

### Client service `src/services/candidate-name-api.ts`
Mirror `criteria-api.ts`: `invoke("extract-candidate-name", { body: { resumeText } })`, defensive shape check, `suggestCandidateName(resumeText): Promise<string>`.

### PDF text extraction `src/services/pdf-extract.ts`
- Add `pdfjs-dist` as a dependency. Import it with `await import("pdfjs-dist")` inside the extraction path only, so it never joins the initial bundle. Set `GlobalWorkerOptions.workerSrc` from `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)`.
- `extractPdfText(file, onProgress)`: iterate pages, call `getTextContent()`, join items with spaces and newlines from `hasEOL`, report `page X of N` per page.
- `readTextFile(file)`: plain `file.text()`.
- Return the raw extracted string; line splitting happens in the editor.

### Numbered line confirmation editor `src/components/line-editor.tsx`
- Input: `DocumentLine[]`, `onChange(lines)`.
- Each row shows the line number plus a textarea for the text.
- Actions per row: edit text, merge into the previous line, split at the textarea caret, delete.
- Any change renumbers lines from 1. Empty lines are dropped on save and on renumber, matching the existing paste behavior.
- Accessible labels and keyboard focus are preserved.

### Page rewrite `src/pages/NewCandidate.tsx`
Keep the existing paste path exactly as-is (name field, resume textarea, read-only numbered preview, direct save), and add:
- A "Suggest name from resume" action enabled when text is present (paste text, or the current file's extracted text). Loading and error states, prefills the shared name input, always editable.
- A file dropzone accepting `.pdf` and `.txt`, multiple files.
- A queue of chosen files processed one at a time. Per-file status: queued, extracting with progress, ready for confirmation, saved, failed, no readable text.
- After extraction the line editor appears for that file with its numbered lines. The reviewer edits, merges, splits, deletes, then presses "Save candidate" which calls the existing `addCandidate` store action. Only then does the next file start. Nothing is saved before this confirmation.
- Quality warnings with thresholds:
  - zero lines: "This file has no readable text. It may be a scanned image. Paste the text instead." with an explicit paste hint.
  - fewer than 3 lines: "Very little text was extracted."
  - majority of lines are one or two words: "Lines look fragmented. Merge them into full sentences."
- Each saved candidate gets its own id via `crypto.randomUUID`, roleId from the active role, documentTitle "Resume".

### Unchanged behavior
Protected files (`scripts/`, `src/data/seed.ts`, `src/types.ts`, `generate-evidence`, `save-review`, `save-workspace`) are not touched. Reason minimums (5 for override, 10 for decision), `citationVerified` server-only, interview evidence never verified, `?criterion=` deep links, and `save-review` workspace scoping all stay as-is.

### Copy rule
No em dashes or en dashes in any new code, copy, comments, or placeholders. Use commas, colons, full stops, or the word "to". Existing files being kept are not rewritten solely to strip dashes.

## Implementation checklist
- [ ] Add `pdfjs-dist` dependency.
- [ ] Create `supabase/functions/extract-candidate-name/index.ts` copying `generate-criteria` protocol handling exactly; deploy it.
- [ ] Create `src/services/candidate-name-api.ts` mirroring `criteria-api.ts`.
- [ ] Create `src/services/pdf-extract.ts` with dynamic `pdfjs-dist` import, worker setup, per-page progress, and text-file reading.
- [ ] Create `src/components/line-editor.tsx` supporting edit, merge, split at caret, delete, and renumbering.
- [ ] Rewrite `src/pages/NewCandidate.tsx`: unchanged paste path, suggest-name action, file queue with one-at-a-time processing and per-file progress, mandatory confirmation, quality warnings, paste fallback for no-text files.
- [ ] Confirm no em/en dashes anywhere in new code and copy.
- [ ] Keep protected files untouched; verify `save-review` and `generate-evidence` byte-identical to `github/main`.

## Verification checklist
- [ ] Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm run build`, `pnpm run build:prod --manifest`.
- [ ] Execute a browser test: paste path still saves with name plus text; no model call on mount (observe network); suggest-name only fires on click; name stays editable.
- [ ] Execute upload tests with a crafted text-layer PDF, a plain `.txt`, and a scanned-image PDF (image only, no text): per-file progress, line editor confirmation, merge/split/delete renumbering, no-text warning with paste fallback, nothing saved before confirm.
- [ ] Confirm multiple-file processing is sequential and each confirmed candidate appears in the workspace.
- [ ] Confirm the new function deploys and is reachable; note whether the model call itself was execution-tested or only code-inspected.
- [ ] State clearly which items were verified by execution and which only by reading code.
