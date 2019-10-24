import { EActions, EMessageStatus } from '../types';
import { IMessageOptions } from './IMessageOptions';
import { IMessageInfo } from './IMessageInfo';

export interface IMessage {
  outgoingId: string,
  incomingId?: string,
  socketId?: string,
  sender: string,
  receiver: string,
  status: EMessageStatus,
  options?: IMessageOptions,
  data: any,
  info?: IMessageInfo
}
