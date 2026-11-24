import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';
import { contextOutput, failureOutput, parseEvent, readEvent } from '../../agent-runtime/protocol.mjs';

test('accepts supported runtime events without copying arbitrary input into feedback', () => {
    const event = parseEvent(JSON.stringify({
        hook_event_name: 'PreToolUse', session_id: 'session-a', turn_id: 'turn-a', cwd: '/tmp/project',
        tool_input: { command: 'secret-value' },
    }));

    const output = contextOutput(event, 'Read the project rules.');

    assert.deepEqual(output, {
        hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: 'Read the project rules.' },
    });
    assert.doesNotMatch(JSON.stringify(output), /secret-value/u);
});

test('rejects malformed, unsupported and oversized event inputs', () => {
    const inputs = ['{', '[]', 'null', '{}', JSON.stringify({
        hook_event_name: 'Other', session_id: 's', cwd: '/tmp',
    }), JSON.stringify({
        hook_event_name: 'Stop', session_id: '', cwd: '/tmp',
    }), ' '.repeat(1024 * 1024 + 1)];

    for (const input of inputs) {
        assert.throws(() => parseEvent(input));
    }
});

test('reads complete streamed input and honors cancellation', async () => {
    const encoded = JSON.stringify({ hook_event_name: 'Stop', session_id: 's', cwd: '/tmp' });

    const event = await readEvent(Readable.from([encoded.slice(0, 10), encoded.slice(10)]));

    assert.equal(event.hook_event_name, 'Stop');

    const abortController = new AbortController();
    abortController.abort();

    await assert.rejects(readEvent(Readable.from([encoded]), abortController.signal), { name: 'AbortError' });
    assert.match(failureOutput().systemMessage, /verification is incomplete/u);
});

test('preserves multibyte paths across chunk boundaries and rejects invalid UTF-8', async () => {
    const bytes = Buffer.from(JSON.stringify({ hook_event_name: 'Stop', session_id: 's', cwd: '/tmp/тест' }));
    const firstCharacter = bytes.indexOf(Buffer.from('т'));

    const event = await readEvent(Readable.from([bytes.subarray(0, firstCharacter + 1), bytes.subarray(firstCharacter + 1)]));

    assert.equal(event.cwd, '/tmp/тест');
    await assert.rejects(readEvent(Readable.from([Buffer.from([0xff])])));
});
