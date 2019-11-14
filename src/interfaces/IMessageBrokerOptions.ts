import { IClientOptions } from './IClientOptions';

export interface IMessageBrokerOptions {
  id: string,
  sendToSocket: Function,
  syncInterval: number,
  eventEmitTimeoutValue: number,
  proxyTo?: IClientOptions[]
}
