import { IClientOptions } from './IClientOptions';

export interface IServerOptions {
  port: string,
  syncInterval: number,
  eventEmitTimeoutValue: number,
  secureKey?: string,
  proxyTo?: IClientOptions[]
}
