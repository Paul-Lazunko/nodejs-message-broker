import { EActions } from '../customTypes';
import { IOutgoingMessage} from './IOutgoingMessage';

export interface IServerRequestParams {
  action: EActions,
  message: IOutgoingMessage
}
