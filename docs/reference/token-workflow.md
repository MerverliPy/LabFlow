# Token Workflow

## Default loop

For any non-trivial task:

1. Start in Plan Mode.
2. Run `/labflow-claude-pack:phase-plan`.
3. Approve one small phase only.
4. Run `/labflow-claude-pack:phase-work`.
5. Run `/labflow-claude-pack:phase-verify`.
6. Run `/labflow-claude-pack:handoff`.
7. Run `/clear`.

## Rules

- One phase per session by default.
- Clear between unrelated tasks.
- Prefer fresh sessions over long-lived chats.
- Use the smallest verification command first.
- Keep `STATE.md` and `PHASE_HANDOFF.md` short and current.
- Keep `MEMORY.md` small and curated.

## When to skip planning

You may skip Plan Mode only for:

- obvious one-file fixes
- trivial docs edits
- narrow typo or config changes

## When to use isolated agents

Use:

- `repo-architect` for structure and boundary decisions
- `verifier` for isolated verification analysis
- `refactor-worktree` for risky multi-file refactors

Do not use subagents for simple local edits.
