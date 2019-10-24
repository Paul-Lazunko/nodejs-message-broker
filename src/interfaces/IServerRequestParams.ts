import { EActions } from '../types';
import { IOutgoingMessage} from './IOutgoingMessage';

export interface IServerRequestParams {
  action: EActions,
  message: IOutgoingMessage
}
