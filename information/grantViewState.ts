export type GrantRequestResult<T> = {
  key: string;
  query: string;
  data?: T;
  error?: boolean;
} | null;

export function resolveGrantViewState<T>(
  result: GrantRequestResult<T>,
  currentKey: string,
) {
  const loading =
    result?.key !== currentKey;

  return {
    loading,
    response: result?.data,
    error: !loading
      ? result?.error
      : undefined,
  };
}
