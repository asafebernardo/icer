import { useEffect, useState } from "react";
import { fetchRuntimeEnv, getRuntimeEnvSync } from "@/lib/runtimeEnv";

export default function useRuntimeEnv() {
  const [env, setEnv] = useState(() => getRuntimeEnvSync());

  useEffect(() => {
    let cancelled = false;
    void fetchRuntimeEnv().then((next) => {
      if (!cancelled) setEnv(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return env;
}
