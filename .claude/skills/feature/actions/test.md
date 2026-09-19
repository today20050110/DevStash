# Test Action

0. Prerequisite: this project has no test runner yet — there is no `test` script in
   `package.json` and Vitest is not installed, and `context/ai-interaction.md` defers
   unit testing ("Implement unit testing later"). If the runner is missing, tell the
   user and **ask before installing Vitest / adding the `test` script**. Stop there if
   they decline.
1. Read current-feature.md to understand what was implemented
2. Identify server actions and utility functions added/modified for this feature
3. Check if tests already exist for these functions
4. For functions without tests that have testable logic, write unit tests:
   - Create unit tests using Vitest
   - Focus on server actions and utilities (not components)
   - Test happy path and error cases
   - Do not write tests just to write them. Use your best judgement
5. Run `npm test` to verify all tests pass
6. Report test coverage for the new feature code
