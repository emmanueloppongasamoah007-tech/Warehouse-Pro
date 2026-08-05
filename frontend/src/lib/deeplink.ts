import { Platform } from "react-native";

export function getAuthRedirectUrl(path: string) {
  if (Platform.OS === "web") {
    return `${window.location.origin}${path}`;
  }

  return `frontend://${path.replace(/^\//, "")}`;
}
