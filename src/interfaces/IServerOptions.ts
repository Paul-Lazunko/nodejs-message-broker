import { IClientOptions } from './IClientOptions';

export interface IServerOptions {
  id: string,
  port: string,
  syncInterval: number,
  eventEmitTimeoutValue: number,
  secureKey?: string,
  proxyTo?: IClientOptions[]
}
