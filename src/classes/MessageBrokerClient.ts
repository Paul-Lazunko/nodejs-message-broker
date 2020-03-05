import { EventEmitter } from 'events';
import { Socket } from 'net';
import {
  EActions,
  EMessageStatus,
  TClientHandler
} from '../customTypes';
import {
  CryptoHelper,
  uidHelper,
  validateClientOptions,
  validateClientRequest
} from '../helpers';
import {
  IClientOptions,
  IClientRequestParams,
  IMessageInfo,
  IMessageOptions,
  IOutgoingMessage,
  IServerRequestParams,
  IMessage
} from '../interfaces';
import { TaskManager } from './TaskManager';
import { TaskError } from '../errors';
import { errors } from '../constants';

const onData: any =  async function (data: string)  {
  try {
    let request;
    try {
      request = this.isSecure
        ? JSON.parse(CryptoHelper.DECRYPT(this.secureKey, data.toString())) : JSON.parse(data.toString());
    } catch (e) {
      return;
    }
    const { action, message } = request;
    switch (action) {
      case EActions.REQUEST:
        this.incomingTaskManager.addTask(message);
        break;
      case EActions.ERROR:
        this.eventEmitter.emit(message.clientId, message);
        break;
      case EActions.RESPONSE:
        this.eventEmitter.emit(message.clientId, null, message);
        break;
      case EActions.ACKNOWLEDGE:
        this.eventEmitter.removeAllListeners(message.clientId);
        break;
      case EActions.RECEIVERS:
        this.receivers = message.data;
        break;
    }
  } catch(error) {
    console.log({ error })
  }
};

export class MessageBrokerClient {
  private socket: Socket;
  private requestHandler: TClientHandler;
  private outgoingTaskManager: TaskManager;
  private incomingTaskManager: TaskManager;
  private isConnected: boolean;
  private eventEmitter: EventEmitter;
  private reconnectTimeout: NodeJS.Timer;
  private readonly secureKey: any;
  public receivers: string[];
  public defaultRequestTimeout: number;
  private get isSecure(): boolean {
    return !! this.secureKey;
  }

  constructor (options: IClientOptions) {
    validateClientOptions(options);
    const { host, port, id, secureKey, defaultRequestTimeout } = options;
    if ( defaultRequestTimeout ) {
      this.defaultRequestTimeout = defaultRequestTimeout;
    }
    if ( secureKey ) {
      this.secureKey = secureKey;
    }
    const self = this;
    this.eventEmitter = new EventEmitter();
    this.requestHandler = options.requestHandler.bind(this);
    this.socket = new Socket();

    this.socket.addListener('connect', () => {
      this.write({
        id,
        action: EActions.INIT
      });
      this.isConnected = true;
      console.log(`Successfully connected to server ${options.host}:${options.port}`);
    });

    this.socket.on('data',  onData.bind(this));

    this.socket.addListener('error', (error: any) => {
      console.log(`Got an error from server ${options.host}:${options.port}: ${error.message}`);
    });

    this.socket.addListener('close', () => {
      this.isConnected = false;
      console.log(`Disconnected from server ${options.host}:${options.port}`);
      if ( options.reconnect ) {
        this.eventEmitter.emit('reconnect')
      }
    });

    this.incomingTaskManager = new TaskManager({
      eventEmitTimeoutValue: options.taskInterval || 0,
      async taskHandler (message: IOutgoingMessage | IMessage): Promise<IOutgoingMessage | IMessage> {
        try {
          const { data, options } = await self.requestHandler(message.data, message.options);
          message.data = data;
          message.options = options;
          return message;
        } catch(error) {
          message.info = message.info || {} as IMessageInfo;
          message.info.error = error.message;
          message.status = EMessageStatus.NOT_HANDLED;
          throw new TaskError(message);
        }
      },
      errorCallback (error: TaskError) {
        self.write({
          message: error.data,
          action: EActions.ERROR
        });
      },
      successCallback (message: IOutgoingMessage | IMessage) {
        self.write({
          message,
          action: EActions.RESPONSE
        });
      }
    });

    this.outgoingTaskManager = new TaskManager({
      eventEmitTimeoutValue: options.taskInterval || 0,
      taskHandler (message: IOutgoingMessage| IMessage): IOutgoingMessage | IMessage {
        if ( !self.isConnected ) {
          throw new TaskError(message);
        }
        return message;
      },
      errorCallback (error: TaskError) {
        self.outgoingTaskManager.addTask(error.data);
      },
      successCallback (message: IOutgoingMessage | IMessage) {
        self.write(message)
      }
    });

    this.eventEmitter.addListener('reconnect', () => {
      // @ts-ignore
      if ( ! this.reconnectTimeout  ) {
        this.reconnectTimeout = setTimeout(()=> {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = undefined;
          this.socket.connect({ host, port });
        }, options.reconnectInterval)
      }
    });

    this.socket.connect({ host, port });
  }

  public async request(params: IOutgoingMessage | any, options: IMessageOptions | any = {}, timeoutValue: number = 0): Promise<any> {
    return new Promise( ( resolve: Function, reject: Function) => {
      try {
        validateClientRequest(params, options, timeoutValue);
      } catch(error) {
        reject(error);
      }
      params.clientId = uidHelper();
      params.options = options;
      const self = this;
      let errorTimeout: any;
      if ( timeoutValue ) {
        params.options = options || {};
        if ( params.options.ttl && params.options.ttl < timeoutValue ) {
          params.options.ttl = timeoutValue;
        }
        errorTimeout = setTimeout(() => {
          self.eventEmitter.removeAllListeners(params.clientId);
          clearTimeout(errorTimeout);
          reject(new Error(`Request ${params.clientId} failed: timeout ${timeoutValue} exceeded`))
        }, timeoutValue);

        this.eventEmitter.addListener(params.clientId, (errorData, response) => {
          if ( errorTimeout ) {
            clearTimeout(errorTimeout)
          }
          self.eventEmitter.removeAllListeners(params.clientId);
          if ( errorData ) {
            const errorMessage: string = errorData.info && errorData.info.error ?
              errors[errorData.info && errorData.info.error] : errors.notDelivered;
            const error: Error = new Error(errorMessage);
            reject(error);
          } else {
            resolve({ data: response.data, options: response.options, status: response.status, info: response.info });
          }
        });
        this.outgoingTaskManager.addTask(params);
      } else {
        this.outgoingTaskManager.addTask(params);
        resolve(true);
      }
    });
  }

  private write(data: any) {
    const response = this.isSecure ? CryptoHelper.ENCRYPT(this.secureKey, JSON.stringify(data)) : JSON.stringify(data);
    this.socket.write(response);
  }

}
