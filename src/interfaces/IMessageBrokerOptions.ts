import { IClientOptions } from './IClientOptions';

export interface IMessageBrokerOptions {
  sendToSocket: Function,
  syncInterval: number,
  eventEmitTimeoutValue: number,
  proxyTo?: IClientOptions[]
}
