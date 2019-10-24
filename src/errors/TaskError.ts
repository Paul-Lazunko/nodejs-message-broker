import {IMessage, IOutgoingMessage} from '../interfaces';

export class TaskError extends Error {
  public data: IOutgoingMessage | IMessage;
  constructor(message: IOutgoingMessage | IMessage) {
    super(message.info.error);
    this.data = message;
  }
}
