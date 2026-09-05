/**
 * Backend client.
 *
 * The browser never talks to Django directly. TanStack server functions proxy
 * the requests to the Django API on the server, which:
 *   - avoids CORS/CSRF friction between the two origins,
 *   - keeps the backend host out of client bundles with secrets,
 *   - lets the site fall back to the in-browser mock when the backend is
 *     unreachable or requires a sign-in (predict).
 *
 * Point VITE_BACKEND_URL at a deployed Django backend in production; in local
 * dev it defaults to the Django dev server.
 */
import { createServerFn } from "@tanstack/react-start";
import { STANDARD_DEPTHS } from "@/lib/ocean-model";

export const BACKEND_BASE_URL =
  (import.meta.env["VITE_BACKEND_URL"] as string | undefined) ?? "http://localhost:8000";

const REQUEST_TIMEOUT_MS = 5000;

export type BackendPredictResponse = {
  mode: string;
  message: string;
  location: { latitude: number; longitude: number };
  date: string | null;
  grid_resolution: string;
  predictions: { depth_m: number; temperature_c: number }[];
};

export type BackendModelStatus = {
  status: string;
  message: string;
  input_variables: string[];
  standard_depths_m: number[];
  region_bounds: {
    min_latitude: number;
    max_latitude: number;
    min_longitude: number;
    max_longitude: number;
  };
};

export type BackendDatasets = {
  surface_inputs: { variable: string; product: string; resolution: string }[];
  target: { variable: string; product: string };
  standard_grid: { spatial_resolution: string; temporal_resolution: string };
};

export type BackendMetricsPerDepth = {
  depth_m: number;
  rmse_c: number;
  correlation: number;
  bias_c: number;
  n?: number;
};

export type BackendMetrics = {
  available: boolean;
  message: string;
  model_name?: string | null;
  metrics?: { rmse_c: number; correlation: number; bias_c: number; n_profiles?: number } | null;
  per_depth: BackendMetricsPerDepth[];
  validation?: { dataset?: string; period?: string; region?: string } | null;
};

export type PredictResult =
  | { source: "live"; temperatures: Record<number, number>; message: string; mode: string }
  | { source: "mock"; message: string };

async function backendJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BACKEND_BASE_URL}${path}`, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    const error = new Error(body?.error ?? `Backend responded with ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

export const fetchPredictions = createServerFn({ method: "POST" })
  .validator((input: { latitude: number; longitude: number; date: string }) => input)
  .handler(async ({ data }): Promise<PredictResult> => {
    try {
      const json = await backendJson<BackendPredictResponse>("/api/predict/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: data.latitude,
          longitude: data.longitude,
          date: data.date,
          depths: [...STANDARD_DEPTHS],
        }),
      });
      const temperatures: Record<number, number> = {};
      for (const prediction of json.predictions) {
        temperatures[prediction.depth_m] = prediction.temperature_c;
      }
      return {
        source: "live",
        temperatures,
        message: json.message,
        mode: json.mode,
      };
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      return {
        source: "mock",
        message:
          status === 401
            ? "Live prediction requires a backend sign-in."
            : "Backend unavailable; showing simulated profile.",
      };
    }
  });

export const fetchModelStatus = createServerFn({ method: "POST" }).handler(
  async (): Promise<BackendModelStatus | null> => {
    try {
      return await backendJson<BackendModelStatus>("/api/model/status/");
    } catch {
      return null;
    }
  },
);

export const fetchDatasets = createServerFn({ method: "POST" }).handler(
  async (): Promise<BackendDatasets | null> => {
    try {
      return await backendJson<BackendDatasets>("/api/datasets/");
    } catch {
      return null;
    }
  },
);

export const fetchMetrics = createServerFn({ method: "POST" }).handler(
  async (): Promise<BackendMetrics | null> => {
    try {
      return await backendJson<BackendMetrics>("/api/metrics/");
    } catch {
      return null;
    }
  },
);
