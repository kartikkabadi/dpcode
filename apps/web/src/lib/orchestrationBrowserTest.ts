import {
  ORCHESTRATION_WS_CHANNELS,
  ORCHESTRATION_WS_METHODS,
  ThreadId,
  type OrchestrationReadModel,
  type OrchestrationShellSnapshot,
  type OrchestrationThread,
} from "@t3tools/contracts";

interface WsPushClient {
  send: (data: string) => void;
}

interface OrchestrationSubscriptionRequestBody {
  _tag: string;
  [key: string]: unknown;
}

export function createShellSnapshotFromReadModel(
  snapshot: OrchestrationReadModel,
): OrchestrationShellSnapshot {
  return {
    snapshotSequence: snapshot.snapshotSequence,
    projects: snapshot.projects
      .filter((project) => project.deletedAt === null)
      .map((project) => ({
        id: project.id,
        title: project.title,
        workspaceRoot: project.workspaceRoot,
        defaultModelSelection: project.defaultModelSelection,
        scripts: project.scripts,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      })),
    threads: snapshot.threads
      .filter((thread) => thread.deletedAt === null)
      .map((thread) => ({
        id: thread.id,
        projectId: thread.projectId,
        title: thread.title,
        modelSelection: thread.modelSelection,
        interactionMode: thread.interactionMode,
        runtimeMode: thread.runtimeMode,
        envMode: thread.envMode,
        branch: thread.branch,
        worktreePath: thread.worktreePath,
        associatedWorktreePath: thread.associatedWorktreePath ?? null,
        associatedWorktreeBranch: thread.associatedWorktreeBranch ?? null,
        associatedWorktreeRef: thread.associatedWorktreeRef ?? null,
        parentThreadId: thread.parentThreadId ?? null,
        subagentAgentId: thread.subagentAgentId ?? null,
        subagentNickname: thread.subagentNickname ?? null,
        subagentRole: thread.subagentRole ?? null,
        forkSourceThreadId: thread.forkSourceThreadId ?? null,
        latestTurn: thread.latestTurn,
        latestUserMessageAt: thread.latestUserMessageAt ?? null,
        hasPendingApprovals: thread.hasPendingApprovals ?? false,
        hasPendingUserInput: thread.hasPendingUserInput ?? false,
        hasActionableProposedPlan: thread.hasActionableProposedPlan ?? false,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        archivedAt: thread.archivedAt ?? null,
        handoff: thread.handoff ?? null,
        session: thread.session,
      })),
    updatedAt: snapshot.updatedAt,
  };
}

export function getThreadDetailFromReadModel(
  snapshot: OrchestrationReadModel,
  threadId: ThreadId,
): OrchestrationThread {
  const thread = snapshot.threads.find((entry) => entry.id === threadId);
  if (!thread) {
    throw new Error(`Missing thread fixture for ${threadId}`);
  }
  return thread;
}

export function emitOrchestrationSubscriptionPushes(input: {
  client: WsPushClient;
  snapshot: OrchestrationReadModel;
  nextSequence: () => number;
  requestBody: OrchestrationSubscriptionRequestBody;
  skipThreadSnapshot?: (threadId: ThreadId) => boolean;
}): void {
  if (input.requestBody._tag === ORCHESTRATION_WS_METHODS.subscribeShell) {
    input.client.send(
      JSON.stringify({
        type: "push",
        sequence: input.nextSequence(),
        channel: ORCHESTRATION_WS_CHANNELS.shellEvent,
        data: {
          kind: "snapshot",
          snapshot: createShellSnapshotFromReadModel(input.snapshot),
        },
      }),
    );
    return;
  }

  if (input.requestBody._tag !== ORCHESTRATION_WS_METHODS.subscribeThread) {
    return;
  }

  const rawThreadId = input.requestBody.threadId;
  if (typeof rawThreadId !== "string") {
    return;
  }

  const threadId = ThreadId.makeUnsafe(rawThreadId);
  if (input.skipThreadSnapshot?.(threadId)) {
    return;
  }

  let thread: OrchestrationThread;
  try {
    thread = getThreadDetailFromReadModel(input.snapshot, threadId);
  } catch {
    return;
  }

  input.client.send(
    JSON.stringify({
      type: "push",
      sequence: input.nextSequence(),
      channel: ORCHESTRATION_WS_CHANNELS.threadEvent,
      data: {
        kind: "snapshot",
        snapshot: {
          snapshotSequence: input.snapshot.snapshotSequence,
          thread,
        },
      },
    }),
  );
}
