export class FetchTimeoutError extends Error {
  constructor(message = "fetch_timeout") {
    super(message);
    this.name = "FetchTimeoutError";
  }
}

/** 为 Promise 增加超时；超时 resolve null（fail-open） */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label?: string
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    void label;
  }
}

export function deadlineRemaining(deadlineMs: number): number {
  return Math.max(0, deadlineMs - Date.now());
}
