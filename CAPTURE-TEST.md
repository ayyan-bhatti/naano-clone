# Capture Test — 8x Assignment

Status: **hook installed and unit-verified; awaiting live two-session canary.**
See [Canary entries](#4-canary-entries) for what is still outstanding.

---

## 1. Tool and model

| | |
|---|---|
| Tool | Claude Code (VS Code extension, Claude Agent SDK runtime) |
| Model | `claude-opus-5[1m]` — Opus 5, 1M context |
| Planner / executor split | None. One model plans and executes. |
| Platform | Windows 11, Node v24.11.1, Git 2.53.0.windows.1 |

---

## 2. Mechanism and config

Claude Code exposes lifecycle **hooks**, which fire automatically on events. Two are wired:

- **`UserPromptSubmit`** → `node .claude/hooks/capture.mjs prompt`
- **`Stop`** (end of turn) → `node .claude/hooks/capture.mjs response`

**Files changed:**

- `.claude/settings.json` — hook registration (project-scoped, committed)
- `.claude/hooks/capture.mjs` — the capture script
- `.claude/capture.config.json` — author / project / tool metadata
- `.gitignore` — explicitly does **not** ignore `.agent-logs/`

Both events receive JSON on stdin including `session_id`, `prompt_id`, `cwd` and
`transcript_path`. `UserPromptSubmit` carries the verbatim `prompt`; `Stop` carries
`last_assistant_message`.

This fires on its own. There is no manual step and nothing to remember.

### What gets captured

Per the guide: **the prompt and the final response, nothing in between.** The script
explicitly excludes:

- `thinking` blocks
- `tool_use` blocks (tool calls)
- `tool_result` blocks (tool output)
- subagent traffic (records flagged `isSidechain: true`)

**One judgement call, stated openly:** the docs recommend `last_assistant_message` for
final turn text, but Claude Code splits a single visible reply into several text blocks
when tool calls sit between them, and that field holds only the last block. The script
therefore reconstructs the full visible reply from the transcript and falls back to
`last_assistant_message` when the transcript is unreadable or the join is shorter. The
log records what a human actually saw on screen, not just its final paragraph.

### Design constraints

- Never breaks a turn — every failure is swallowed, always exits 0.
- Silent on success. `UserPromptSubmit` stdout is injected into the model's context, so
  printing anything would pollute it.
- Entries are append-only. Only the frontmatter counters (`total_exchanges`,
  `last_prompt_time`, `model`) are rewritten; no logged entry is ever edited.
- Repeat `Stop` fires for one turn are deduped on `prompt_id`.

---

## 3. Log file path

`.agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md` — one file per session.

Dedup state lives in `.agent-logs/.state-<session-id>.json` and is the only ignored
item in that directory; it is bookkeeping, not part of the record.

---

## 4. Canary entries

> **Outstanding.** The hook config was created partway through the first session, after
> that session's prompt had already been submitted, so `UserPromptSubmit` could not fire
> for it retroactively. Claude Code picks hook changes up mid-session via a file
> watcher, so no restart is needed — but a genuine canary needs a prompt submitted
> *after* installation, and step 4.3 needs a second session, which is a human action.
>
> To complete: send `CAPTURE TEST — 8x assignment, <your name>` in this session, then
> again in a fresh session. Both pairs get pasted in raw below.

### Session 1 canary

```
(pending)
```

### Session 2 canary — proves the hook is not session-local

```
(pending)
```

---

## 5. Things tried first that did not work

Kept per the guide's instruction to leave dead ends in.

1. **Claimed the setup guide was unreachable without trying it.** The first response to
   the assignment asserted `8x-internal.com` couldn't be verified and treated Phase 0 as
   blocked, having only reasoned about the URL rather than requesting it. It resolves
   fine. The page is JS-rendered, so a plain fetch returned only the `<title>`; a
   JS-rendering scrape returned the full guide. Asserting a blocker before testing it
   cost a full round trip.

2. **Bash heredoc to write the script.** Failed with
   `unexpected EOF while looking for matching quote`. Git Bash on Windows terminated the
   command with CRLF, so the heredoc delimiter line read as `CAPTURE_EOF\r` and never
   matched `CAPTURE_EOF`. Switched to the editor tool for multi-line files.

3. **A full-width `］` (U+FF3D) in `records[i]`.** Slipped in during authoring and broke
   `node --check`. Caught only because the script was syntax-checked before being
   trusted — an unchecked hook fails silently and produces an empty log, which is the
   worst possible failure mode here.

4. **Initially parsed the transcript for response text without knowing
   `last_assistant_message` existed.** Reading the hooks docs surfaced the documented
   field; the script now prefers whichever source is richer rather than either alone.
