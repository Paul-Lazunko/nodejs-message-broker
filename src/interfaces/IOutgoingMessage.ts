import { IMessageInfo } from './IMessageInfo';
import { IMessageOptions } from './IMessageOptions';
import {EActions,EMessageStatus} from '../customTypes';

export interface IOutgoingMessage {
  serverId?: string,
  clientId?: string,
  sender?: string,
  status?: EMessageStatus,
  data?: any
  info?: IMessageInfo
  options?: IMessageOptions
}
