const supportedEvents = new Set([
    'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse',
    'SubagentStop', 'Stop', 'Interrupt',
]);

export function parseEvent(text) {
    if (Buffer.byteLength(text, 'utf8') > 1024 * 1024) {
        throw new Error('Hook input exceeds the supported one-megabyte limit.');
    }

    const event = JSON.parse(text);

    if (!event || typeof event !== 'object' || Array.isArray(event)) {
        throw new Error('Hook input must be a JSON object.');
    }

    if (!supportedEvents.has(event.hook_event_name)) {
        throw new Error('Unsupported hook event.');
    }

    for (const field of ['session_id', 'cwd']) {
        if (typeof event[field] !== 'string' || !event[field].trim() || /[\x00-\x1f]/u.test(event[field])) {
            throw new Error(`Hook input requires a valid ${field}.`);
        }
    }

    if (event.turn_id !== undefined && (typeof event.turn_id !== 'string' || !event.turn_id.trim())) {
        throw new Error('Hook turn_id must be a nonempty string.');
    }

    return event;
}

export function contextOutput(event, additionalContext) {
    if (!additionalContext) return {};

    return {
        hookSpecificOutput: {
            hookEventName: event.hook_event_name,
            additionalContext,
        },
    };
}

export function failureOutput() {
    return {
        systemMessage: 'Devkit hook failed; verification is incomplete. Run make agent-task status and inspect the local diagnostics. A failed hook does not prove that the client blocked the operation.',
    };
}

export async function readEvent(stream, signal) {
    const chunks = [];
    let inputBytes = 0;
    const abort = () => stream.destroy(signal.reason);
    signal?.addEventListener('abort', abort, { once: true });

    try {
        signal?.throwIfAborted();

        for await (const chunk of stream) {
            signal?.throwIfAborted();
            const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');
            inputBytes += bytes.length;

            if (inputBytes > 1024 * 1024) {
                throw new Error('Hook input exceeds the supported one-megabyte limit.');
            }

            chunks.push(bytes);
        }

        signal?.throwIfAborted();

        return parseEvent(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
    } finally {
        signal?.removeEventListener('abort', abort);
    }
}
