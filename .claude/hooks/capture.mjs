#!/usr/bin/env node
/**
 * 8x assignment - agent capture hook.
 *
 * Fires automatically from .claude/settings.json:
 *   UserPromptSubmit -> `node .claude/hooks/capture.mjs prompt`
 *   Stop             -> `node .claude/hooks/capture.mjs response`
 *
 * Writes one markdown file per session into .agent-logs/.
 * Captures the verbatim prompt and the final assistant text for that turn.
 * Deliberately excludes: thinking blocks, tool calls, tool results, subagent
 * (sidechain) traffic, and every intermediate step.
 *
 * This script must never break a turn: all failures are swallowed and it
 * always exits 0. It prints nothing on success, because UserPromptSubmit
 * stdout is injected into the model's context.
 */

import fs from 'node:fs';
import path from 'node:path';

const MODE = process.argv[2];
const FALLBACK_MODEL = 'unknown-model';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function readConfig(cwd) {
  const defaults = { author: 'TODO-github-handle', project: 'naano-rebuild', tool: 'claude-code' };
  try {
    const raw = fs.readFileSync(path.join(cwd, '.claude', 'capture.config.json'), 'utf8');
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

/** Parse the JSONL session transcript into an array of records. */
function readTranscript(transcriptPath) {
  if (!transcriptPath) return [];
  try {
    return fs
      .readFileSync(transcriptPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** Most recent model actually used, so a mid-build model switch is visible. */
function detectModel(records) {
  for (let i = records.length - 1; i >= 0; i -= 1) {
    const m = records[i]?.message?.model;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  return null;
}

function isRealUserPrompt(rec) {
  if (rec?.type !== 'user' || rec?.isSidechain === true) return false;
  const content = rec?.message?.content;
  if (typeof content === 'string') return content.trim().length > 0;
  if (!Array.isArray(content)) return false;
  // A "user" record that is only tool_result blocks is the harness feeding a
  // tool response back in, not a human turn.
  return content.some((b) => b?.type === 'text');
}

/**
 * The assistant text for the turn that just ended.
 *
 * Anchored on the last assistant record we already logged, NOT on the last user
 * prompt. During autonomous work one prompt can span many assistant turns, so
 * anchoring on the prompt made every Stop re-collect the whole session and the
 * dedup guard then suppressed all of it - the log silently stopped after the
 * first turn. Anchoring on the last logged record gives exactly the new text
 * each time, whether the session is conversational or autonomous.
 *
 * Claude Code splits one visible reply across several text blocks when tool
 * calls sit between them, so all of them are joined; taking only the last would
 * drop most of the answer.
 */
function responseSince(records, lastLoggedUuid) {
  let start = 0;

  if (lastLoggedUuid) {
    const idx = records.findIndex((r) => r?.uuid === lastLoggedUuid);
    if (idx >= 0) start = idx + 1;
  } else {
    // Nothing logged yet: fall back to the last real user prompt.
    for (let i = records.length - 1; i >= 0; i -= 1) {
      if (isRealUserPrompt(records[i])) {
        start = i + 1;
        break;
      }
    }
  }

  const parts = [];
  let uuid = null;
  for (let i = start; i < records.length; i += 1) {
    const rec = records[i];
    if (rec?.type !== 'assistant' || rec?.isSidechain === true) continue;
    const content = rec?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block?.type === 'text' && typeof block.text === 'string' && block.text.trim()) {
        parts.push(block.text.trim());
      }
    }
    if (rec.uuid) uuid = rec.uuid;
  }

  return { text: parts.join('\n\n'), uuid };
}

function stamp(d = new Date()) {
  return d.toISOString();
}

function fileStamp(d = new Date()) {
  return d.toISOString().replace('T', '_').replace(/:/g, '-').slice(0, 19);
}

function findOrCreateLog(logDir, sessionId, cfg, model) {
  const suffix = `_${sessionId}.md`;
  let existing = null;
  try {
    existing = fs.readdirSync(logDir).find((f) => f.endsWith(suffix)) ?? null;
  } catch {
    /* directory may not exist yet */
  }
  if (existing) return path.join(logDir, existing);

  const now = new Date();
  const file = path.join(logDir, `${fileStamp(now)}${suffix}`);
  const short = sessionId.slice(0, 8);
  const frontmatter = [
    '---',
    `session_id: ${sessionId}`,
    `date: ${now.toISOString().slice(0, 10)}`,
    `author: ${cfg.author}`,
    `model: ${model}`,
    `tool: ${cfg.tool}`,
    `project: ${cfg.project}`,
    'total_exchanges: 0',
    `first_prompt_time: ${stamp(now)}`,
    `last_prompt_time: ${stamp(now)}`,
    '---',
    '',
    `# Session Log - ${now.toISOString().slice(0, 10)}`,
    '',
    `Session: \`${short}\` | Project: \`${cfg.project}\` | Author: \`${cfg.author}\``,
    '',
    '---',
    '',
    '',
  ].join('\n');
  fs.writeFileSync(file, frontmatter, 'utf8');
  return file;
}

/**
 * Refresh the counter fields only. Logged entries themselves are never
 * rewritten - the guide is explicit that entries are append-only.
 */
function updateFrontmatter(body, { exchanges, lastTime, model }) {
  const end = body.indexOf('\n---', 3);
  if (!body.startsWith('---') || end === -1) return body;
  const head = body.slice(0, end);
  const rest = body.slice(end);
  const patched = head
    .replace(/^total_exchanges: .*$/m, `total_exchanges: ${exchanges}`)
    .replace(/^last_prompt_time: .*$/m, `last_prompt_time: ${lastTime}`)
    .replace(/^model: .*$/m, `model: ${model}`);
  return patched + rest;
}

function appendEntry(file, type, sessionId, model, text) {
  let body = fs.readFileSync(file, 'utf8');
  const prompts = (body.match(/\[LOG_ENTRY type=PROMPT /g) || []).length;
  const responses = (body.match(/\[LOG_ENTRY type=RESPONSE /g) || []).length;
  // Numbered per type: one prompt can produce many responses during autonomous
  // work, so a shared counter would misrepresent the session.
  const num = (type === 'PROMPT' ? prompts : responses) + 1;
  const short = sessionId.slice(0, 8);
  const now = stamp();

  const entry = [
    `[LOG_ENTRY type=${type} num=${num} session=${short}]`,
    `timestamp: ${now}`,
    `model: ${model}`,
    '',
    text,
    '',
    '',
  ].join('\n');

  body = updateFrontmatter(body + entry, {
    exchanges: type === 'PROMPT' ? prompts + 1 : Math.max(prompts, 1),
    lastTime: now,
    model,
  });
  fs.writeFileSync(file, body, 'utf8');
}

/** Guard against the Stop hook firing more than once for one turn. */
function statePath(logDir, sessionId) {
  return path.join(logDir, `.state-${sessionId}.json`);
}

function readState(logDir, sessionId) {
  try {
    return JSON.parse(fs.readFileSync(statePath(logDir, sessionId), 'utf8'));
  } catch {
    return {};
  }
}

function markLogged(logDir, sessionId, uuid) {
  try {
    fs.writeFileSync(statePath(logDir, sessionId), JSON.stringify({ lastResponseUuid: uuid }), 'utf8');
  } catch {
    /* non-fatal */
  }
}

function main() {
  const payload = (() => {
    try {
      return JSON.parse(readStdin() || '{}');
    } catch {
      return {};
    }
  })();

  const cwd = payload.cwd || process.cwd();
  const logDir = path.join(cwd, '.agent-logs');
  fs.mkdirSync(logDir, { recursive: true });

  const sessionId = payload.session_id || 'unknown-session';
  const cfg = readConfig(cwd);
  const records = readTranscript(payload.transcript_path);
  const model = detectModel(records) || FALLBACK_MODEL;
  const file = findOrCreateLog(logDir, sessionId, cfg, model);

  if (MODE === 'prompt') {
    const text = typeof payload.prompt === 'string' ? payload.prompt : '';
    if (!text.trim()) return;
    appendEntry(file, 'PROMPT', sessionId, model, text);
    return;
  }

  if (MODE === 'response') {
    // The Stop payload carries the final assistant text directly, which is the
    // documented source and survives an unreadable transcript. The transcript
    // join is still preferred when it is strictly richer, because Claude Code
    // splits one visible reply across several text blocks around tool calls
    // and `last_assistant_message` holds only the last of them.
    const direct = typeof payload.last_assistant_message === 'string' ? payload.last_assistant_message.trim() : '';
    const lastLogged = readState(logDir, sessionId).lastResponseUuid;
    const { text: joined, uuid } = responseSince(records, lastLogged);
    const text = joined.length >= direct.length ? joined : direct;

    // Nothing new since the last entry - a repeat Stop for the same turn.
    if (!text.trim()) return;
    if (uuid && uuid === lastLogged) return;

    appendEntry(file, 'RESPONSE', sessionId, model, text);
    markLogged(logDir, sessionId, uuid);
  }
}

try {
  main();
} catch {
  // Never break the turn over logging.
}
process.exit(0);
