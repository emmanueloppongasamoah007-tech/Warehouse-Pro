import { OptimizeRouteRequest, OptimizeRouteResponse } from "@/types/route";
import { apiPost } from "./client";

export async function optimizeRoute(
  request: OptimizeRouteRequest
): Promise<OptimizeRouteResponse> {
  return apiPost<OptimizeRouteResponse>("/api/routes/optimize", request);
}
