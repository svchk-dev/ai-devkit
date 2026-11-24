import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const files = [];

function visit(directory) {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
        if (['.git', 'vendor', 'node_modules', 'tmp'].includes(item.name)) continue;

        const path = resolve(directory, item.name);

        if (item.isDirectory()) visit(path);
        else if (item.name.endsWith('.md')) files.push(path);
    }
}

visit(root);

for (const path of files) {
    const content = readFileSync(path, 'utf8');
    const name = relative(root, path);

    if (!content.endsWith('\n') || content.includes('\r')) errors.push(`${name}: invalid newline`);
    content.split('\n').forEach((line, index) => {
        if (/[\t ]+$/u.test(line)) errors.push(`${name}:${index + 1}: trailing whitespace`);
    });

    const prose = content.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '');

    for (const match of prose.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/gu)) {
        const target = match[1].trim().replace(/^<(.+)>$/u, '$1');

        if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/iu.test(target)) continue;

        const destination = resolve(dirname(path), decodeURIComponent(target.split(/[?#]/u)[0]));

        if (!destination.startsWith(root + sep) || !existsSync(destination)) errors.push(`${name}: invalid link ${target}`);
    }
}

if (errors.length) {
    process.stderr.write(errors.join('\n') + '\n');
    process.exitCode = 1;
} else {
    process.stdout.write(`Documentation checks passed (${files.length} Markdown files).\n`);
}
