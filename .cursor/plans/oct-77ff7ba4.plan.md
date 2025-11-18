<!-- 77ff7ba4-242c-409e-b406-fe4b5cfb5bc2 9d4ae63f-efca-443f-b07b-50588e080a1d -->
# Validate repo string format in readFile

### Goal

Enhance robustness by explicitly validating that the `repo` argument in `readFile` conforms to the expected "owner/name" format, preventing cryptic errors from downstream Octokit calls.

### Plan

1. **Update `readFile` in `src/github/app-client.ts`**

- Modify the `readFile` function to split the `repo` string and check if it contains exactly two non-empty parts (owner and name).
- Throw a clear error message if the format is invalid: `Invalid repo format: "${repo}". Expected 'owner/name'.`

2. **Verify with tests**

- Add a test case to `src/github/app-client.test.ts` that passes an invalid repo string (e.g., "invalid-repo" or "owner/") and asserts that the specific error is thrown.
- Ensure existing tests pass.

3. **Commit and push**

- Commit the changes to the current PR branch.
- Push to update PR #35.

### To-dos

- [ ] Inspect `@octokit/app` and `@octokit/rest` types to understand the constructor and `getInstallationOctokit` return type mismatch.
- [ ] Add an `InstallationOctokit` type alias in `src/github/app-client.ts` based on `ReturnType<typeof app.getInstallationOctokit>` and update `getInstallationOctokit` to return it without unsafe casts.
- [ ] Replace `Octokit: Octokit as any` in `app-client.ts` with a narrowly-typed constructor assertion that avoids `any`/`unknown`.
- [ ] Update `readFile` and any callers (e.g., `list-files.ts`) to use `InstallationOctokit` or a minimal interface instead of hard-coding `Octokit` from `@octokit/rest`.
- [ ] Run MCP GitHub server tests and build (`npm test`, `npm run build`) to ensure type safety and behavior are preserved.