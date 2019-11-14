import {
  EventEmitter
} from 'events';
import {
  MESSAGE_BROKER_CHECK_EVENT,
  MESSAGE_BROKER_SYNC_EVENT,
  MESSAGE_BROKER_SYNC_TIMEOUT_VALUE
} from '../constants';
import {
  EActions,
  EMessageStatus,
  ETaskErrorCodes
} from '../types';
import {
  IClientOptions,
  IMessage,
  IMessageBrokerOptions,
  IOutgoingMessage,
  IStorageStructure
} from '../interfaces';
import {
  validateStore,
  roundRobinGetter
} from '../helpers';
import {
  TaskError
} from '../errors';
import {
  store
} from '../common';
import {
  TaskManager
} from './TaskManager';
import {
  MessageBrokerClient
} from './MessageBrokerClient';

export class MessagesBroker {

  private readonly id: string;
  private incomingTaskManager: TaskManager;
  private outgoingTaskManager: TaskManager;
  private messageBuffer: Map<string, IMessage>;
  private services: Map<string, string[]>;
  private proxyTo: MessageBrokerClient[];

  sendToSocket: Function;

  private eventEmitter: EventEmitter;
  private syncTimeOut: NodeJS.Timer | any;
  private checkTimeOut: NodeJS.Timer | any;

  constructor(options: IMessageBrokerOptions) {
    this.id = options.id;
    let restore: IStorageStructure = {
      messageBuffer: {},
      // @ts-ignore
      incomingQueue: [],
      // @ts-ignore
      outgoingQueue: [],
    };
    try {
      restore = JSON.parse(store.get(this.id));
      validateStore(restore);
    } catch(e) {}
    this.eventEmitter = new EventEmitter();
    this.services = new Map<string, string[]>();
    this.messageBuffer = new Map<string, IMessage>();
    this.sendToSocket = options.sendToSocket;
    const self = this;

    this.incomingTaskManager = new TaskManager({
      eventEmitTimeoutValue: options.eventEmitTimeoutValue || 0,
      async taskHandler (message: IMessage): Promise<IMessage> {
        const messageIsNotExpired: boolean = self.checkMessageOptionsTtl(message);
        let found: boolean = false;
        if ( messageIsNotExpired ) {
          const receiverIds = self.services.get(message.receiver);
          if ( receiverIds && receiverIds.length ) {
            const sid = roundRobinGetter(receiverIds);
            self.sendToSocket(sid, { message: self.convertMessageToOutgoingMessage(message), action: EActions.REQUEST });
            return message;
          }
          for ( let i = 0; i < self.proxyTo.length; i = i + 1) {
            if ( self.proxyTo[i].receivers.includes(message.receiver) ) {
              found = true;
              self.proxyTo[i].request({ action: message.receiver, data: message.data }, message.options)
                .then(response => {
                  message.data = response.data;
                  message.status = response.status;
                  message.info = message.info || {};
                  message.info.deliveredAt = response.info.deliveredAt;
                  message.info.handledAt = new Date().getTime();
                  const senderIds = self.services.get(message.sender);
                  if ( senderIds && senderIds.length ) {
                    const sid = roundRobinGetter(senderIds);
                    self.sendToSocket( sid,  {
                      message: self.convertMessageToOutgoingMessage(message),
                      action: EActions.RESPONSE
                    });
                  }
                })
                .catch(error => {
                  console.log({ error })
                });
              break;
            }
          }
          if ( !found ) {
            message.info = message.info || {};
            message.info.error = ETaskErrorCodes.NOT_DELIVERED;
            throw new TaskError(message);
          }
        } else {
          message.info = message.info || {};
          message.info.error = ETaskErrorCodes.EXPIRED;
          throw new TaskError(message);
        }
      },
      errorCallback (error: TaskError) {
        const senderIds = self.services.get(error.data.sender);
        if ( senderIds && senderIds.length ) {
          const sid = roundRobinGetter(senderIds);
          self.sendToSocket( sid,  { message: self.convertMessageToOutgoingMessage(error.data), action: EActions.ERROR });
        }
      },
      successCallback (message: IMessage) {
        if ( message ) {
          message.info = message.info || {};
          message.info.deliveredAt = new Date().getTime();
          self.messageBuffer.set(message.outgoingId, message);
        }
      }
    });

    this.outgoingTaskManager = new TaskManager({
      eventEmitTimeoutValue: options.eventEmitTimeoutValue || 0,
      taskHandler (message: IMessage): IMessage {
        const senderIds = self.services.get(message.sender);
        if ( Array.isArray(senderIds) && senderIds.length ) {
          const action: string = message.status === EMessageStatus.HANDLED ? EActions.RESPONSE : EActions.ERROR;
          senderIds.forEach((sid:string) => {
            self.sendToSocket(sid, { action, message: self.convertMessageToOutgoingMessage(message) });
          });
          return message;
        }
        throw new TaskError(message);
      },
      errorCallback (error: TaskError) {
        if ( error.data ) {
          self.outgoingTaskManager.addTask(error.data);
        }
      },
      successCallback (message: IMessage) {
      }
    });

    this.proxyTo = options.proxyTo.map((clientOptions: IClientOptions) => {
      return new MessageBrokerClient(clientOptions);
    });

    for (const id in restore.messageBuffer) {
      this.messageBuffer.set(id, restore.messageBuffer[id]);
    }
    restore.incomingQueue.map((message: IMessage) => this.incomingTaskManager.addTask(message));
    restore.outgoingQueue.map((message: IMessage) => this.outgoingTaskManager.addTask(message));

    this.eventEmitter.on(MESSAGE_BROKER_SYNC_EVENT, () => {
      this.syncTimeOut = setTimeout(() => {
        this.sync();
        clearTimeout(this.syncTimeOut);
        this.eventEmitter.emit(MESSAGE_BROKER_SYNC_EVENT)
      }, options.syncInterval || MESSAGE_BROKER_SYNC_TIMEOUT_VALUE)
    });

    this.eventEmitter.on(MESSAGE_BROKER_CHECK_EVENT, () => {
      this.checkTimeOut = setTimeout(() => {
        this.messageBuffer.forEach((message: IMessage, key: string) => {
          const messageIsNotExpired: boolean = self.checkMessageOptionsTtl(message);
          if ( !messageIsNotExpired ) {
            this.messageBuffer.delete(key);
          }
        });
        clearTimeout(this.checkTimeOut);
        this.eventEmitter.emit(MESSAGE_BROKER_CHECK_EVENT)
      }, options.eventEmitTimeoutValue)
    });
    this.eventEmitter.emit(MESSAGE_BROKER_CHECK_EVENT);
    this.eventEmitter.emit(MESSAGE_BROKER_SYNC_EVENT);
  }

  public processRequest(message: IMessage) {
    if ( message ) {
      message.info = message.info || {};
      message.status = EMessageStatus.RECEIVED;
      message.info.receivedAt = new Date().getTime();
      this.incomingTaskManager.addTask(message);
    }
  }

  public processResponse(message: IMessage) {
    if (message) {
      const storedMessage = this.messageBuffer.get(message.outgoingId);
      if (storedMessage) {
        this.messageBuffer.delete(message.outgoingId);
        const isNotHandled: boolean = message.status === EMessageStatus.NOT_HANDLED;
        storedMessage.status = isNotHandled ? EMessageStatus.NOT_HANDLED : EMessageStatus.HANDLED;
        storedMessage.info = storedMessage.info || {};
        storedMessage.info.handledAt = new Date().getTime();
        storedMessage.data = message.data;
        this.outgoingTaskManager.addTask(storedMessage);
      }
    }
  }

  public addService(id: string, socketId: string) {
    if ( this.services.get(id) ) {
      this.services.get(id).push(socketId);
    } else {
      this.services.set(id, [ socketId ]);
    }
  }

  public removeService(socketId: string) {
    this.services.forEach((service: string[]) => {
      if ( service.includes(socketId) ) {
        service.splice(service.indexOf(socketId),1)
      }
    });
  }

  private convertMessageToOutgoingMessage(message: IMessage | IOutgoingMessage): IOutgoingMessage {
    const { outgoingId, incomingId, data, options, status, info } = message;
    return { outgoingId, incomingId, data, options, status, info };
  }

  private checkMessageOptionsTtl(message: IMessage): boolean {
    if ( (!message.options || !message.options.ttl) || ( !message.info  || !message.info.receivedAt ) ) {
      return true;
    }
    return message.info.receivedAt + message.options.ttl > new Date().getTime();
  }

  private sync() {
    store.set(this.id, JSON.stringify({
      messageBuffer: this.messageBuffer,
      // @ts-ignore
      incomingQueue: this.incomingTaskManager.queueManager.queue,
      // @ts-ignore
      outgoingQueue: this.outgoingTaskManager.queueManager.queue,
    }));
  }

}
