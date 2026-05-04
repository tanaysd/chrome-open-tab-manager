# Open Tab Transfer (Chrome Extension)

Chrome-only Manifest V3 extension to export and import open tabs privately between Chrome instances.

## V1 feature set
- Export tabs from current window or all windows.
- Optional encrypted exports (PBKDF2 + AES-GCM).
- Strict payload validation with schema version checks.
- Export chunking for large tab sets.
- Import batching and large-import confirmation safeguards.
- Optional exact-URL dedupe during import.

## Local usage
1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Use popup controls:
   - **Export chunk size** to split export files.
   - **Import batch size** to throttle restore behavior.

## Testing strategy
### Automated
- `npm test` (Node built-in test runner).
- Covers normalization, dedupe, validation, schema versioning, chunking, and crypto roundtrip.

### Manual E2E checklist
1. Export current window with chunk size 100.
2. Export all windows with chunk size 10 and verify multiple files.
3. Import encrypted file with correct passphrase.
4. Import encrypted file with wrong passphrase and verify failure.
5. Import large file and verify confirmation prompt appears.
6. Import with batch size 10 and verify success status includes batches.
7. Verify `chrome://` tabs are excluded.

## Release readiness (GitHub + CWS)
- Branch strategy: phased PRs for V1.
- Keep changelog updated per phase.
- Package as ZIP for Chrome Web Store submission after QA.

## Asset note
- PNG icon binaries are excluded in this patch transport path; add `icons/icon16.png`, `icons/icon48.png`, and `icons/icon128.png` before Chrome Web Store submission.
