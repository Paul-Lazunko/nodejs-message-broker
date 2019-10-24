import { TClientHandler } from "../types";

export interface IClientOptions {
  host: string,
  port: number,
  action: string,
  secureKey?: string,
  requestHandler: TClientHandler,
  reconnect?: boolean,
  taskInterval?: number,
  reconnectInterval?: number
}
