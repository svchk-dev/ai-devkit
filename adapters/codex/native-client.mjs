import { spawn } from 'node:child_process';

export async function requestCodex(root, method, params, timeoutMs) {
    return new Promise((resolve, reject) => {
        const child = spawn('codex', ['app-server', '--stdio'], { cwd: root, stdio: ['pipe', 'pipe', 'ignore'] });
        let buffered = '';
        let settled = false;
        const timeout = setTimeout(() => finish(new Error('Local Codex client request timed out.')), timeoutMs);

        function finish(error, result) {
            if (settled) return;

            settled = true;
            clearTimeout(timeout);
            child.stdin.end();
            child.kill();
            if (error) reject(error);
            else resolve(result);
        }

        child.on('error', () => finish(new Error('Local Codex client request is unavailable.')));
        child.on('close', () => {
            if (!settled) finish(new Error('Local Codex closed before returning its response.'));
        });
        child.stdin.on('error', () => finish(new Error('Local Codex client request connection closed.')));
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
            buffered += chunk;

            if (Buffer.byteLength(buffered) > 4 * 1024 * 1024) {
                finish(new Error('Local Codex client request exceeded its limit.'));
                return;
            }

            let newline;

            while ((newline = buffered.indexOf('\n')) !== -1) {
                const line = buffered.slice(0, newline);
                buffered = buffered.slice(newline + 1);
                let message;

                try { message = JSON.parse(line); } catch { finish(new Error('Local Codex returned an invalid protocol message.')); return; }

                if (message.id === 1) {
                    if (message.error) { finish(new Error('Local Codex initialization failed.')); return; }

                    child.stdin.write(JSON.stringify({ method: 'initialized' }) + '\n');
                    child.stdin.write(JSON.stringify({ id: 2, method, params }) + '\n');
                }

                if (message.id === 2) {
                    if (message.error) finish(new Error(`Installed Codex does not provide a usable ${method} operation.`));
                    else finish(null, message.result);
                }
            }
        });

        child.stdin.write(JSON.stringify({ id: 1, method: 'initialize', params: {
            clientInfo: { name: 'ai-devkit', version: '1.0.0' }, capabilities: { experimentalApi: true },
        } }) + '\n');
    });
}

export async function projectIsTrusted(root, timeoutMs = 1500) {
    const { config, layers } = await requestCodex(root, 'config/read', { cwd: root, includeLayers: true }, timeoutMs);
    const trusted = (settings) => settings?.projects?.[root]?.trust_level === 'trusted';
    const userLayer = layers?.find((layer) => layer.name?.type === 'user');

    return trusted(config) && trusted(userLayer?.config);
}
