import { IClientOptions } from './IClientOptions';

export interface IServerOptions {
  id: string,
  port: number,
  syncInterval: number,
  eventEmitTimeoutValue: number,
  secureKey?: string,
  proxyTo?: IClientOptions[]
}
