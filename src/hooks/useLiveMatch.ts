import { useState, useEffect, useRef } from "react";

export interface LiveMatchSnapshot {
  id: number;
  homeTeam: { name: string; crest: string };
  awayTeam: { name: string; crest: string };
  competition: string;
  minute: number;
  score: { home: number; away: number };
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  yellowCards: { home: number; away: number };
  redCards: { home: number; away: number };
  probabilities: { home: number; draw: number; away: number; over25: number; under25: number };
  timeline: Array<{ minute: number; type: string; team: string; message: string }>;
  originMeta?: {
    origin: string;
    systemId: string;
    timestamp: number;
  };
}

export function useLiveMatch(matchId: number | null) {
  const [data, setData] = useState<LiveMatchSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }

    const connectSSE = () => {
      setLoading(true);
      setError(null);

      // Clean stream if any already exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const streamUrl = `/api/live-stream?matchId=${matchId}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);

          // Validation Safeguard: Reject if there is a root-level error payload or if the data lacks origin tracking
          if (payload && (payload.error || payload.status === "error")) {
            setError(payload.detail || payload.message || payload.error || "NO_DATA_AVAILABLE");
            setData(null);
            setLoading(false);
            es.close();
            return;
          }

          if (!payload || !payload.id || !payload.originMeta) {
            console.error("[SafeSide useLiveMatch] Payload is corrupt, missing origin metadata or match ID verification.");
            setError("NO_DATA_AVAILABLE: Received telemetry without verified data origin details.");
            setData(null);
            setLoading(false);
            es.close();
            return;
          }

          setData(payload as LiveMatchSnapshot);
          setLoading(false);
          retryCountRef.current = 0; // reset reconnect count on successful frame
        } catch (err) {
          console.error("[SafeSide useLiveMatch] payload parse error:", err);
          setError("Malformed downstream remote telemetry received.");
          setLoading(false);
        }
      };

      es.onerror = (err) => {
        console.error("[SafeSide useLiveMatch] SSE network connection failed:", err);
        setError("Network feed temporarily interrupted or locked out. Re-syncing satellite links...");
        es.close();

        // Implement exponential backoff reconnects to prevent thread blocking
        const delay = Math.min(30000, Math.pow(2, retryCountRef.current) * 2000);
        retryCountRef.current++;

        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [matchId]);

  return {
    data,
    loading,
    error,
    isReconnecting: retryCountRef.current > 0
  };
}
