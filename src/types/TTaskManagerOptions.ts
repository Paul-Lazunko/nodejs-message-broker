import {IMessage, IOutgoingMessage} from '../interfaces';

export type TTaskManagerOptions = {
  eventEmitTimeoutValue: number
  taskHandler (task: IMessage | IOutgoingMessage): IMessage | IOutgoingMessage | Promise<IOutgoingMessage | IMessage>
  errorCallback (error: Error): any
  successCallback (data: any): any
}
