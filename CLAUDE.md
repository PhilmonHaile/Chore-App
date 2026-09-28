
## Reviewer agent
After building each story, use the `reviewer` subagent (defined in `.claude/agents/reviewer.md`).
It checks the diff against the PRD at `docs/PRD.md` and runs the test suite.
