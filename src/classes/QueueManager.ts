import { EventEmitter } from 'events';
import {
  IMessage,
  IOutgoingMessage,
  IStartable,
  IStopable
} from '../interfaces';
import { TQueueManagerOptions } from '../customTypes';

export class QueueManager implements IStartable, IStopable {
    private queue: IMessage[] & IOutgoingMessage[];
    private eventEmitter: EventEmitter;
    private tickEventEmitTimeout: any;
    private readonly taskHandler: Function;
    private readonly successCallback: Function;
    private readonly errorCallback: Function;
    private readonly taskHandlerContext: any;
    private readonly eventEmitTimeoutValue: number;
    private readonly tickEventName: string;

    constructor(options: TQueueManagerOptions) {
        const {
            queue,
            tickEventName,
            taskHandler,
            successCallback,
            errorCallback,
            taskHandlerContext,
            eventEmitTimeoutValue
        } = options;
        this.queue = queue || [];
        this.eventEmitter = new EventEmitter();
        this.tickEventName = tickEventName;
        this.taskHandler = taskHandler;
        this.successCallback = successCallback;
        this.errorCallback = errorCallback;
        this.taskHandlerContext = taskHandlerContext;
        this.eventEmitTimeoutValue = eventEmitTimeoutValue;
    }

    protected tickEmitter() {
        if ( this.tickEventEmitTimeout ) {
            clearTimeout(this.tickEventEmitTimeout);
            this.tickEventEmitTimeout = undefined;
        }
        this.eventEmitter.emit(this.tickEventName, this.queue);
    }

    protected async tickHandler(): Promise<void> {
        if ( this.queue.length ) {
            const task: IMessage = this.queue.shift();
            try {
                const result: any = await this.taskHandler.apply(this.taskHandlerContext, [ task ]);
                this.successCallback(result);
            } catch (error) {
                this.errorCallback(error);
            }
        }
        this.setTickEventEmitTimeout();

    }

    private setTickEventEmitTimeout() {
        this.tickEventEmitTimeout = setTimeout(this.tickEmitter.bind(this), this.eventEmitTimeoutValue);
    }

    public start() {
        this.eventEmitter.on(this.tickEventName, this.tickHandler.bind(this));
        this.tickEmitter();
    }

    public stop() {
        this.eventEmitter.removeListener(this.tickEventName, this.tickHandler);
    }
}
