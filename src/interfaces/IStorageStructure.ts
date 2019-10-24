import { IMessage } from './IMessage';

export interface IStorageStructure {
  messageBuffer: any,
  incomingQueue: IMessage[],
  outgoingQueue: IMessage[]
}
