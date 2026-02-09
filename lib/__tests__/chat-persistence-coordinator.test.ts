import {
  acquireChatDeleteLock,
  isChatDeleteLocked,
  runChatOperation,
  runListOperation,
} from "../chat-persistence-coordinator";

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function createDeferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe("chat-persistence-coordinator", () => {
  it("serializes list operations in submission order", async () => {
    const first = createDeferred();
    const executionOrder: string[] = [];

    const op1 = runListOperation(async () => {
      executionOrder.push("list-1-start");
      await first.promise;
      executionOrder.push("list-1-end");
    });

    const op2 = runListOperation(async () => {
      executionOrder.push("list-2-start");
      executionOrder.push("list-2-end");
    });

    await Promise.resolve();
    expect(executionOrder).toEqual(["list-1-start"]);

    first.resolve();
    await Promise.all([op1, op2]);

    expect(executionOrder).toEqual([
      "list-1-start",
      "list-1-end",
      "list-2-start",
      "list-2-end",
    ]);
  });

  it("serializes chat operations per chat scope", async () => {
    const first = createDeferred();
    const executionOrder: string[] = [];

    const op1 = runChatOperation("42", async () => {
      executionOrder.push("chat-42-first-start");
      await first.promise;
      executionOrder.push("chat-42-first-end");
    });

    const op2 = runChatOperation("42", async () => {
      executionOrder.push("chat-42-second-start");
      executionOrder.push("chat-42-second-end");
    });

    await Promise.resolve();
    expect(executionOrder).toEqual(["chat-42-first-start"]);

    first.resolve();
    await Promise.all([op1, op2]);

    expect(executionOrder).toEqual([
      "chat-42-first-start",
      "chat-42-first-end",
      "chat-42-second-start",
      "chat-42-second-end",
    ]);
  });

  it("tracks delete lock lifecycle for chat open/delete guards", () => {
    expect(isChatDeleteLocked(7)).toBe(false);

    const release = acquireChatDeleteLock(7);
    expect(isChatDeleteLocked(7)).toBe(true);

    release();
    expect(isChatDeleteLocked(7)).toBe(false);
  });
});
