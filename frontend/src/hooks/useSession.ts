import { useState, useCallback } from "react";

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  const updateSessionId = useCallback((id: string) => {
    setSessionId(id);
  }, []);

  return { sessionId, updateSessionId };
}
