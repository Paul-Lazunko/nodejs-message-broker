# Node.js Message Broker
See example at:
 
 https://github.com/Paul-Lazunko/nodejs-message-broker_example

 Has next advantages:
- It is built as a node.js application (TCP server) and is not dependent on any external services, such as redis, rabbitmq-server, etc.
- Very easy to use, no specific application level protocols
- Can be easily customized to Your needs
- Simple and fast interaction between clients with JSON string messages
- All interaction can be encypted/decrypted on the fly
- Restores queues and works in case of restart or temporary failure
- Several servers can interact between themselves as separated systems or replicas which are proxied with provided load balancer 

**The simplest example of usage:**


Install package
```shell script
npm i -s nodejs-message-broker; 
```

Create message broker server and clients instances:

```typescript
import { MessageBrokerServer } from 'nodejs-message-broker';

const server: MessageBrokerServer = new MessageBrokerServer({
  id: 'server1',
  port: 8888, 
  syncInterval: 5000, 
  eventEmitTimeoutValue: 10, 
  secureKey: 'someSecureKey' 
});
```

Server options object passed to the server's constructor includes next keys:
- **id**: server unique id;
- **port**: port which will be listening;
- **syncInterval**: time interval between attempts to storing memory data in file system (optional, default is 7000 ms)
- **eventEmitTimeoutValue**: time interval between messages handling (optional, default 0 ms)
- **secureKey**: key for encryption, same secureKey should be provided to clients, if it is provided all messages between server and clients will be encrypted (optional)

Create clients: 

```typescript
import { MessageBrokerClient } from 'nodejs-message-broker';

const client1 = new MessageBrokerClient({
  host: '127.0.0.1',
  port: 8888,
  reconnect: true,
  reconnectInterval: 1000,
  taskInterval: 10,
  action: 'client_1',
  secureKey: 'someSecureKey',
  requestHandler: async (data, options) => {
    console.log({ data, options });
    return { data, options };
  }
});

```
Client options object passed to the client's constructor includes next keys:
- **host**: message broker server host;
- **port**: message broker server port;
- **reconnect**: boolean which indicates do recoonect or not when connection to server is lost;
- **reconnectInterval**: time interval between reconnection attempts
- **taskInterval**: time interval between messages handling (optional, default 0 ms)
- **secureKey**: key for encryption, same secureKey should be provided to clients, 
  if it is provided all messages between server and clients will be encrypted (optional)
- **action**: name of this client for calling from another clients side;
- **requestHandler**: handler for requests (takes two arguments - data and options)


For interactions between clients you can use "request" method in any client context. 
This method takes three arguments: 
- first argument is an object with **action** (which specifies client to which you send request) 
  and **data** (which will be passed to this client requestHandler) properties, 
- the second is an object with additional options (**ttl** - time to live value for message in milliseconds, 
**broadcast** - boolean identifier which indicates that message should be delivered to all clients with same action property), 
- the third argument is positive integer which limits max execution time for this request 
  (error will be thrown when this value will be exceeded)

```typescript
import { MessageBrokerClient } from 'nodejs-message-broker';

const client2 = new MessageBrokerClient({
  host: '127.0.0.1',
  port: 8888,
  reconnect: true,
  reconnectInterval: 1000,
  taskInterval: 10,
  action: 'client_2',
  secureKey: 'someSecureKey',
  requestHandler: async (data, options) => {
    console.log({ data, options });
    return { data, options };
  }
});

// Create request from this client:

async function start() {
  try {
    const response = await client2.request(
      {
        action: 'client_1',
        data: {
          value: 2
        }
      },
      {
        ttl: 10000
      },
      10000);
    console.log({ response });
  } catch(error) {
    console.log({ error });
  }
}

start();

```

### Load balancing:

Create servers (notice that load balancing usage means that "**secureKey**" option should be the same for all proxied instances. 
Instead of this you can use different secureKeys fo each server and follow next schema to provide interaction between several separated systems)

```typescript
import { MessageBrokerServer } from 'nodejs-message-broker';

const server_1: MessageBrokerServer = new MessageBrokerServer({
  id: 'server_1',
  port: 8887,
  syncInterval: 5000,
  eventEmitTimeoutValue: 10,
  secureKey: 'someSecureKey',
  proxyTo: [{
    host: '127.0.0.1',
    port: 8886,
    reconnect: true,
    reconnectInterval: 1000,
    taskInterval: 100,
    secureKey: 'test',
    action: 'server_1',
    requestHandler: async (data, options) => {
      return ({ data, options})
    }
  }]
});
```

```typescript
import { MessageBrokerServer } from 'nodejs-message-broker';

const server_2: MessageBrokerServer = new MessageBrokerServer({
  id: 'server_2',
  port: 8886, 
  syncInterval: 5000, 
  eventEmitTimeoutValue: 10, 
  secureKey: 'someSecureKey',
  proxyTo: [{
     host: '127.0.0.1',
     port: 8887,
     reconnect: true,
     reconnectInterval: 1000,
     taskInterval: 100,
     secureKey: 'test',
     action: 'server_2',
     requestHandler: async (data, options) => {
       return ({ data, options })
     }
  }]
});
```

Create load balancer:

```typescript
import { MessageBrokerLoadBalancer } from 'nodejs-message-broker';

const loadBalancer = new MessageBrokerLoadBalancer({
  port: 8888,
  instances: [
    {
      host: 'localhost',
      port: 8886
    },
    {
      host: 'localhost',
      port: 8887
    }
  ]
});
```

Connect your clients to load balancer:

```typescript
import { MessageBrokerClient } from 'nodejs-message-broker';

const client = new MessageBrokerClient({
  host: '127.0.0.1',
  port: 8888,
  reconnect: true,
  reconnectInterval: 1000,
  taskInterval: 10,
  action: 'client_1',
  secureKey: 'someSecureKey',
  requestHandler: async (data, options) => {
    console.log({ data, options });
    return { data, options };
  }
});

```
