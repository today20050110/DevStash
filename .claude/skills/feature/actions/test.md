# Test Action

Vitest is set up (`vitest.config.mts`, `vitest.setup.mts`). Follow the Testing section
of `context/coding-standards.md`; `src/actions/password-reset.test.ts` is the reference
for mocking a server action's dependencies.

1. Read current-feature.md to understand what was implemented
2. Identify server actions (`src/actions/`) and utility functions (`src/lib/`)
   added/modified for this feature — not components, pages, or route handlers
3. Check if tests already exist for these functions (colocated `*.test.ts`)
4. For functions without tests that have testable logic, write unit tests:
   - Colocate as `src/.../name.test.ts`
   - Mock the database, Upstash, Resend and Next.js request APIs — tests must never
     reach a real service
   - Test happy path and error cases
   - Do not write tests just to write them. Use your best judgement
5. Run `npm test` to verify all tests pass
6. Report test coverage for the new feature code
