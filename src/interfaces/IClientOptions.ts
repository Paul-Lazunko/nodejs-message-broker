import { TClientHandler } from '../customTypes';

export interface IClientOptions {
  host: string,
  port: number,
  id: string,
  secureKey?: string,
  requestHandler: TClientHandler,
  reconnect?: boolean,
  taskInterval?: number,
  reconnectInterval?: number
}
