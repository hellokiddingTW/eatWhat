export const createRetryableLoader = <T>(factory: () => Promise<T>) => {
  let pending: Promise<T> | undefined;

  return () => {
    pending ??= factory().catch((error) => {
      pending = undefined;
      throw error;
    });

    return pending;
  };
};
