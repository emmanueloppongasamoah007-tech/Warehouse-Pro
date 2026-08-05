import Constants from "expo-constants";

const resolveEnv = (name: string) => {
  return (
    process.env[name] ??
    (Constants.expoConfig?.extra as Record<string, string> | undefined)?.[name] ??
    undefined
  );
};

export const apiBaseUrl =
  resolveEnv("EXPO_PUBLIC_API_BASE_URL") ?? "http://localhost:8080";

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API request failed: ${response.status} ${response.statusText} - ${text}`
    );
  }

  return (await response.json()) as T;
}
