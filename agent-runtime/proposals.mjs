import { readAdapter } from './adapter.mjs';
import { existsSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const changeName = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

export function shellCommands(source) {
    const commands = [];
    let words = [];
    let word = '';
    let quote = null;
    let escaped = false;
    let comment = false;
    let writes = false;
    const flushWord = () => { if (word) words.push(word); word = ''; };
    const flushCommand = () => {
        flushWord();
        if (words.length) commands.push({ words, writes });
        words = [];
        writes = false;
    };

    for (const character of source) {
        if (comment) {
            if (character === '\n') { comment = false; flushCommand(); }

            continue;
        }

        if (escaped) {
            word += character;
            escaped = false;

            continue;
        }

        if (character === '\\' && quote !== "'") {
            escaped = true;

            continue;
        }

        if (quote) {
            if (character === quote) quote = null;
            else word += character;

            continue;
        }

        if (character === '#' && !word) { comment = true; continue; }
        if (character === "'" || character === '"') {
            quote = character;

            continue;
        }

        if (character === '>') writes = true;

        if (/[;&|\n]/u.test(character)) {
            flushCommand();

            continue;
        }

        if (/\s/u.test(character)) {
            flushWord();

            continue;
        }

        word += character;
    }

    if (quote || escaped) return [];

    flushCommand();

    return commands;
}

export function proposalCreationTargets(command) {
    const targets = [];

    for (const parsed of shellCommands(command)) {
        let { words } = parsed;
        while (/^[A-Za-z_][A-Za-z0-9_]*=/u.test(words[0] ?? '')) words = words.slice(1);

        if (words[0] === 'npx') {
            words = words.slice(1);
            if (words[0] === '--no-install') words = words.slice(1);
        }

        if (words[0] === 'make' && words.includes('spec')) {
            const argumentsValue = words.find((word) => word.startsWith('ARGS='))?.slice(5);
            words = argumentsValue ? shellCommands(argumentsValue)[0]?.words ?? [] : [];
        } else if (/(?:^|\/)openspec$/u.test(words[0] ?? '')) {
            words = words.slice(1);
        } else continue;

        if (words[0] === 'new' && words[1] === 'change' && changeName.test(words[2] ?? '')) targets.push(words[2]);
    }

    return targets;
}

export function activeChanges(root) {
    const directory = join(root, 'openspec/changes');

    if (!existsSync(directory)) return [];

    return readdirSync(directory, { withFileTypes: true })
        .filter((entry) => entry.name !== 'archive' && (entry.isDirectory() || entry.isSymbolicLink()))
        .map((entry) => entry.name).sort();
}

export function observeProposalPermission(root, state, event) {
    if (event.hook_event_name === 'PostToolUse' && state.pendingProposal?.toolUseId
        && state.pendingProposal.toolUseId === event.tool_use_id) {
        const response = event.tool_response;
        const success = response?.exit_code === 0 || response?.metadata?.exit_code === 0 || response?.success === true
            || (typeof response === 'string' && /^(?:Process exited with code 0|Success\. Updated the following files:)/mu.test(response));

        if (success) consumeProposalGrant(root, state, state.pendingProposal.name);

        state.pendingProposal = null;
    }

    if (event.hook_event_name !== 'UserPromptSubmit' || typeof event.prompt !== 'string') return '';

    const match = /^allow-unarchived-proposal ([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/u.exec(event.prompt.trim());

    if (!match) return '';
    if (activeChanges(root).includes(match[1])) return `Change ${match[1]} already exists; continue it without a new-proposal exception.`;

    state.proposalGrant = { name: match[1], sessionId: state.sessionId, userTurnId: event.turn_id ?? null };

    return `Explicit user exception recorded for new OpenSpec change ${match[1]} in this session only. Continue the separately authorized proposal; other new changes remain gated.`;
}

export function consumeProposalGrant(root, state, name) {
    if (state.proposalGrant?.name === name && existsSync(join(root, 'openspec/changes', name, '.openspec.yaml'))) {
        state.proposalGrant = null;
    }
}

export function proposalBlockReason(root, state, name, { continuation = false } = {}) {
    const adapter = readAdapter(root);

    if (!adapter.profiles.includes('openspec') || !adapter.openspec?.archiveFirst) return '';

    if (!changeName.test(name) || name === 'archive') throw new Error('Expected a non-reserved kebab-case OpenSpec change name.');
    if (continuation && existsSync(join(root, 'openspec/changes', name, '.openspec.yaml'))) return '';

    const pending = activeChanges(root);

    if (!pending.length) return '';
    if (state?.proposalGrant?.name === name && state.proposalGrant.sessionId === state.sessionId) return '';

    return `DEVKIT-OPENSPEC-ACTIVE: cannot start new change ${name}. Unarchived changes: ${pending.join(', ')}. Suggest requesting sync/archive of completed work first; do not archive unfinished work automatically. Only a separate user prompt "allow-unarchived-proposal ${name}" authorizes this named exception without archival.`;
}

export function proposalToolBlock(root, state, event) {
    const input = event.tool_input;
    const command = typeof input === 'string' ? input : input?.command ?? input?.cmd ?? '';
    const targets = new Map();

    if (typeof command === 'string' && /(?:Bash|exec_command)$/u.test(event.tool_name ?? '')) {
        for (const name of proposalCreationTargets(command)) targets.set(name, false);
    }

    const paths = [input?.file_path, input?.path];

    if (typeof command === 'string' && /(?:apply_patch|Edit|Write)$/u.test(event.tool_name ?? '')) {
        for (const match of command.matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)$/gmu)) paths.push(match[1]);
    }

    for (const path of paths.filter((value) => typeof value === 'string')) {
        const local = relative(root, resolve(event.cwd, path)).replaceAll('\\', '/');
        const match = /^openspec\/changes\/([^/]+)\//u.exec(local);

        if (match && match[1] !== 'archive' && changeName.test(match[1])) targets.set(match[1], true);
    }

    for (const [name, continuation] of targets) {
        const reason = proposalBlockReason(root, state, name, { continuation });

        if (reason) return reason;

        if (state.proposalGrant?.name === name && event.tool_use_id) {
            state.pendingProposal = { name, toolUseId: event.tool_use_id };
        }
    }

    return '';
}
