import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "madleets_enabled";

export function useMadLeetsEnabled() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val !== null) setEnabled(val === "true");
      setLoaded(true);
    });
  }, []);

  const toggle = useCallback(
    (value: boolean) => {
      setEnabled(value);
      AsyncStorage.setItem(STORAGE_KEY, String(value));
    },
    [],
  );

  return { enabled, loaded, toggle };
}
