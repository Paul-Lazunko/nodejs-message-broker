import { createServer, Server, Socket } from 'net';
import { MessagesBroker } from './MessagesBroker';
import { IMessage, IServerOptions, IServerRequestParams } from '../interfaces';
import { EActions, EMessageStatus } from '../types';
import {
  CryptoHelper,
  uidHelper,
  validateInit,
  validateMessage,
  validateResponse,
  validateServerOptions
} from '../helpers';

export class MessageBrokerServer {
  private server: Server;
  private sockets: Map <string, Socket>;
  private socketNames: Map <string, string>;
  private messageBroker: MessagesBroker;
  private readonly secureKey: any;

  private get isSecure (): boolean {
    return !! this.secureKey;
  }

  private get receivers(): string[] {
    const receivers: string[] = [];
    this.socketNames.forEach((receiver:string) => {
      receivers.push(receiver);
    });
    return receivers;
  }

  constructor(options: IServerOptions) {
    validateServerOptions(options);
    if ( options.secureKey ) {
      this.secureKey = options.secureKey;
    }
    this.messageBroker = new MessagesBroker({
      sendToSocket: this.sendToSocket.bind(this),
      syncInterval: options.syncInterval,
      eventEmitTimeoutValue: options.eventEmitTimeoutValue,
      proxyTo: options.proxyTo || []
    });
    this.sockets = new Map<string, Socket>();
    this.socketNames = new Map<string, string>();
    this.server = createServer(this.onConnection.bind(this));
    this.server.listen(options.port);
  }

  onConnection(socket: Socket) {
    const id = uidHelper();
    this.sockets.set(id, socket);
    socket.addListener('data', (data) => {
      try {
        let options: any;
        if ( this.isSecure ) {
          options = CryptoHelper.DECRYPT(this.secureKey, data.toString());
        }
        options = JSON.parse(options);
        options.socketId = id;
        this.onData(options)
      } catch(e) {
        socket.end()
      }
    });
    console.log(`Connected client #${id}`);
    socket.on('end', () => {
      console.log(`Disconnected client #${id}`);
      this.messageBroker.removeService(id);
      this.socketNames.delete(id)
      this.sockets.delete(id);
      this.sendReceiversToSockets();
    });
  }

  onData(data: any) {
    switch (data.action) {
      case EActions.INIT:
        validateInit(data);
        this.messageBroker.addService(data.id, data.socketId);
        this.socketNames.set(data.socketId, data.id);
        console.log(`Client #${data.socketId} was initialized with action "${data.id}"`);
        this.sendReceiversToSockets();
        break;
      case EActions.RESPONSE:
      case EActions.ERROR:
        validateResponse(data);
        this.messageBroker.processResponse(data.message);
        break;
      default:
        validateMessage(data);
        const message: IMessage = {
          outgoingId: uidHelper(),
          incomingId: data.incomingId,
          socketId: data.socketId,
          status: EMessageStatus.DEFAULT,
          sender: this.socketNames.get(data.socketId),
          receiver: data.action,
          data: data.data,
          options: data.options
        };
        this.messageBroker.processRequest(message);
        break;
    }
  }

  sendToSocket(socketId: string, data: IServerRequestParams) {
    const socket = this.sockets.get(socketId);
    if ( socket ) {
      const response = this.isSecure ? CryptoHelper.ENCRYPT(this.secureKey, JSON.stringify(data)) : JSON.stringify(data);
      socket.write(response);
    }
  }

  sendReceiversToSockets() {
    const data = this.receivers;
    this.sockets.forEach((socket: Socket, socketId: string) => {
      this.sendToSocket(socketId, { action: EActions.RECEIVERS, message: {data} })
    });
  }

}

