// @ts-ignore
import joi from '@hapi/joi';

const taskManagerOptionsSchema = joi.object({
  taskHandler: joi.func().required(),
  errorCallback: joi.func().required(),
  successCallback: joi.func().required(),
  eventEmitTimeoutValue: joi.number().positive().integer().allow(0)
});


const clientOptionsSchema = joi.object({
  host: joi.string().required(),
  port: joi.number().positive().integer().min(1025).max(65536).required(),
  id: joi.string().disallow('init','request','response','acknowledge', 'error').required(),
  reconnectInterval: joi.number().positive().integer(),
  taskInterval: joi.number().positive().integer(),
  defaultRequestTimeout: joi.number().positive().integer(),
  reconnect: joi.boolean(),
  requestHandler: joi.func().required(),
  secureKey: joi.string()
});

const serverOptionsSchema = joi.object({
  id: joi.string(),
  port: joi.number().positive().integer().min(1025).max(65536).required(),
  syncInterval: joi.number().positive().integer().required(),
  eventEmitTimeoutValue: joi.number().positive().integer(),
  secureKey:joi.string(),
  proxyTo: joi.array().items(clientOptionsSchema)
});


const messageSchema = joi.object({
  id: joi.string(),
  clientId: joi.string(),
  serverId: joi.string(),
  socketId: joi.string(),
  sender: joi.string(),
  receiver: joi.string(),
  status: joi.string().valid(
    'enqueued',
    'received',
    'delivered',
    'handled',
    'notDelivered',
    'notHandled'
  ),
  options: joi.object({
    ttl: joi.number().positive().integer(),
    broadcast: joi.boolean()
  }),
  data: joi.any(),
  info: joi.object({
    receivedAt: joi.number().positive().integer(),
    deliveredAt: joi.number().positive().integer(),
    handledAt: joi.number().positive().integer(),
  })
});

const storeStructure = joi.object({
  messageBuffer: joi.any(),
  incomingQueue: joi.array().items(messageSchema),
  outgoingQueue: joi.array().items(messageSchema),
});

const initSchema = joi.object({
  id: joi.string().required(),
  action: joi.string().required(),
  socketId: joi.any().required()
});

const responseSchema = joi.object({
  action: joi.string(),
  socketId: joi.any().required(),
  message: messageSchema
});

const messageDataSchema = joi.object({
  id: joi.string().required(),
  data: joi.any().required()
});

const messageOptionsSchema = joi.object({
  ttl: joi.number().positive().integer(),
  broadcast: joi.boolean()
});

const requestTimeoutSchema = joi.object({
  requestTimeout: joi.number().positive().integer()
});

export function validateClientRequest(data: any, options: any, requestTimeout: number) {
  validate(messageDataSchema, data);
  if ( options ) {
    validate(messageOptionsSchema, options);
  }
  if ( requestTimeout ) {
    validate(requestTimeoutSchema, { requestTimeout });
  }
}

export function validateInit(options: any) {
  return validate(initSchema, options);
}

export function validateResponse(options: any) {
  return validate(responseSchema, options);
}

export function validateClientOptions(options: any): void {
  return validate(clientOptionsSchema, options);
}

export function validateServerOptions(options: any): void {
  return validate(serverOptionsSchema, options);
}

export function validateTaskManagerOptions(options: any): void {
  return validate(taskManagerOptionsSchema, options);
}

export function validateStore(options: any): void {
  return validate(storeStructure, options);
}

export function validateMessage(options: any): void {
  return validate(messageSchema, options);
}

function validate(schema: joi.ObjectSchema, options: any): void {
  const { error } = schema.validate(options);
  if ( error ) {
    throw new Error(error.toString());
  }
}
