// import { MessageBrokerServer } from './classes/MessageBrokerServer'
//
// const server = new MessageBrokerServer({ host: '127.0.0.1', port: 8888, syncInterval: 1000, eventEmitTimeoutValue: 10000  });

export { MessageBrokerServer, MessageBrokerClient, MessageBrokerLoadBalancer } from './classes'
export { IClientOptions, IClientRequestParams, IServerOptions, ILoadBalancerOptions } from './interfaces'
