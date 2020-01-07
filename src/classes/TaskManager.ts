import { TTaskManagerOptions } from '../customTypes';
import {IMessage, IOutgoingMessage} from '../interfaces';
import { QueueManager } from './QueueManager';
import { validateTaskManagerOptions } from '../helpers';
import {
    QUEUE_HANDLER_TICK_EVENT_NAME,
    QUEUE_HANDLER_EVENT_TIMEOUT_VALUE
}  from '../constants';

export class TaskManager {

  protected queue: IOutgoingMessage [] & IMessage [] = [];
    private queueManager: QueueManager;

    constructor (options: TTaskManagerOptions) {
      validateTaskManagerOptions(options);
      this.queueManager = new QueueManager({
            queue: this.queue,
            taskHandlerContext: this,
            taskHandler: options.taskHandler,
            successCallback: options.successCallback,
            errorCallback: options.errorCallback,
            tickEventName: QUEUE_HANDLER_TICK_EVENT_NAME,
            eventEmitTimeoutValue: options.eventEmitTimeoutValue || QUEUE_HANDLER_EVENT_TIMEOUT_VALUE
        });
        this.queueManager.start();
    }

    public addTask(task: IMessage| IOutgoingMessage)  {
        this.queue.push(task);
    }

}
