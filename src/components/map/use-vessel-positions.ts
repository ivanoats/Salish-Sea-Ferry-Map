import { useEffect, useState } from "react";
import type { VesselPosition } from "@/domain/vessel";

const POLL_INTERVAL_MS = 15_000;

interface VesselPositionsState {
  readonly vessels: readonly VesselPosition[];
  /** Set if the API call fails or WSF_API_KEY isn't configured — used to show a quiet note rather than retry forever. */
  readonly unavailable: boolean;
}

const EMPTY_STATE: VesselPositionsState = { vessels: [], unavailable: false };

/** Polls `/api/vessels` while `enabled`, and clears back to empty when switched off or unmounted. */
export function useVesselPositions(enabled: boolean): VesselPositionsState {
  const [state, setState] = useState<VesselPositionsState>(EMPTY_STATE);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const poll = async () => {
      try {
        const response = await fetch("/api/vessels");
        const body = (await response.json()) as { vessels?: VesselPosition[]; error?: string };
        if (cancelled) return;
        setState(response.ok ? { vessels: body.vessels ?? [], unavailable: false } : { vessels: [], unavailable: true });
      } catch {
        if (!cancelled) setState({ vessels: [], unavailable: true });
      }
    };

    void poll();
    const interval = setInterval(() => void poll(), POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      setState(EMPTY_STATE);
    };
  }, [enabled]);

  return state;
}
