import { IMessageInfo } from './IMessageInfo';
import { IMessageOptions } from './IMessageOptions';
import {EActions,EMessageStatus} from "../types";

export interface IOutgoingMessage {
  outgoingId?: string,
  incomingId?: string,
  sender?: string,
  status?: EMessageStatus,
  data?: any
  info?: IMessageInfo
  options?: IMessageOptions
}
