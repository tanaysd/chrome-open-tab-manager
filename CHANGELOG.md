# Changelog

## 1.0.0 - 2026-05-04
### Added
- Strict import payload validation with schema version checks.
- Configurable export chunking to split large transfers into multiple files.
- Configurable import batching for safer large restores.
- Large-import confirmation guardrail.
- Structured error codes in background message handling.

### Improved
- Crypto envelope includes explicit version marker (`v`) and authenticated data compatibility handling.
- Export and import flows now report files/batches in status messages.
- Unit test coverage expanded for chunking and versioned payload validation.

## 0.2.0 - 2026-05-04
### Added
- Export option for current window vs all windows.
- Import option to deduplicate URLs.
- Shared logic module (`lib.js`) with reusable payload normalization, validation, dedupe, and crypto helpers.
- Automated Node test suite for normalization, dedupe, payload validation, and encryption/decryption roundtrip.
