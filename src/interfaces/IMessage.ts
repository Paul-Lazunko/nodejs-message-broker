import { EActions, EMessageStatus } from '../customTypes';
import { IMessageOptions } from './IMessageOptions';
import { IMessageInfo } from './IMessageInfo';

export interface IMessage {
  serverId: string,
  clientId?: string,
  socketId?: string,
  sender: string,
  receiver: string,
  status: EMessageStatus,
  options?: IMessageOptions,
  data: any,
  info?: IMessageInfo
}
