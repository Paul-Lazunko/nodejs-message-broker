import {IMessage, IOutgoingMessage} from '../interfaces';

export type TQueueManagerOptions = {
    queue: IMessage[] & IOutgoingMessage[],
    tickEventName: string,
    taskHandler: Function,
    successCallback: Function,
    errorCallback: Function,
    taskHandlerContext: any,
    eventEmitTimeoutValue: number
}
