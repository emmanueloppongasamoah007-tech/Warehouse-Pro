import { useEffect, useState } from "react";
import * as Font from "expo-font";

export default function useLoadFonts() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        await Font.loadAsync({
          // Font files: place these under `assets/fonts/` (see README)
          "IBMPlexSans-Regular": require("@/../frontend/assets/fonts/IBMPlexSans-Regular.ttf"),
          "IBMPlexSans-Bold": require("@/../frontend/assets/fonts/IBMPlexSans-Bold.ttf"),
          "JetBrainsMono-Regular": require("@/../frontend/assets/fonts/JetBrainsMono-Regular.ttf"),
        });
      } catch (e) {
        // swallow — fonts may not exist yet in assets (developer will add them)
        console.warn("Font load warning:", e);
      }

      if (mounted) setLoaded(true);
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  return loaded;
}
