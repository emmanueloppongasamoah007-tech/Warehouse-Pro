export interface OptimizeRouteRequest {
  startCode: string;
  pickListCodes: string[];
}

export interface OptimizeRouteResponse {
  orderedBinCodes: string[];
  totalDistance: number;
}

export interface ActiveOrder {
  startCode: string;
  pickListCodes: string[];
}
