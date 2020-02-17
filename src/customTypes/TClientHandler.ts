import {
  IClientResponseParams,
  IMessageOptions
} from '../interfaces';

export type TClientHandler =  (data: any, options: IMessageOptions) => IClientResponseParams
