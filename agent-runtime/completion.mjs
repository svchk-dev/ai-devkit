import { requiredChecks } from './checks.mjs';
import { digest } from './repository.mjs';
import { currentReceipts } from './runner.mjs';
import { reviewIsCurrent } from './review.mjs';
import { agentCommand } from './protocol.mjs';

export async function completionRequirements(root, state, task) {
    const missing = [];

    if (task?.mode !== 'change') return missing;
    if (task.scopeMissing || !task.paths.length) missing.push(`Establish the actual authorized change scope and check profile with ${agentCommand} scope.`);

    const receipts = await currentReceipts(root, state, task);

    try {
        for (const checkId of requiredChecks(task, root)) {
            if (!receipts[checkId]) missing.push(`Run ${agentCommand} check --check ${checkId} with the current --session.`);
        }
    } catch (error) {
        missing.push(error.message);
    }

    if (!await reviewIsCurrent(root, task)) missing.push('Obtain a completed current independent project review.');

    return missing;
}

export async function assessCompletion(root, state, task, event) {
    if (!task) return {};

    const checkpoint = task.checkpoint;
    task.checkpoint = null;
    const valid = checkpoint && checkpoint.sessionId === state.sessionId && checkpoint.turnId === event.turn_id
        && checkpoint.taskId === task.id && checkpoint.scopeRevision === task.scopeRevision
        && checkpoint.generation === state.generation && checkpoint.inputHash === state.inputHash;
    const missing = [];

    if (!valid) missing.push(`Create a single-use checkpoint for this runtime turn with ${agentCommand} checkpoint.`);

    if (valid && checkpoint.outcome !== 'complete') {
        task.lastHandoff = { outcome: checkpoint.outcome, reason: checkpoint.reason, turnId: event.turn_id };

        return {};
    }

    missing.push(...await completionRequirements(root, state, task));

    if (!missing.length && valid) {
        task.status = 'closed';
        task.lastHandoff = { outcome: 'complete', turnId: event.turn_id };
        state.activeTask = null;

        return {};
    }

    const failureSignature = digest([task.id, task.scopeRevision, state.inputHash, missing]);

    if (task.failureSignature === failureSignature || event.stop_hook_active) {
        task.lastHandoff = { outcome: 'incomplete', missing, turnId: event.turn_id };

        return { systemMessage: `Devkit task is incomplete: ${missing.join(' ')} Report the limitation; no successful completion was recorded.` };
    }

    task.failureSignature = failureSignature;

    return { decision: 'block', reason: `Devkit completion requirements: ${missing.join(' ')} Correct actionable omissions, or record an honest incomplete/waiting/progress checkpoint with a concrete reason.` };
}
