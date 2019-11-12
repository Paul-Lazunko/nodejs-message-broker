import { createServer, Server, Socket } from 'net';
import { IProxyInstanceParams,ILoadBalancerOptions } from '../interfaces';
import { roundRobinGetter } from '../helpers';

export class MessageBrokerLoadBalancer {

  private proxyServer: Server;
  private readonly instances: IProxyInstanceParams[];

  constructor(options: ILoadBalancerOptions) {
    this.instances = options.instances;
    this.proxyServer = createServer((socket: Socket) => {
      try {
        const proxySocket = new Socket();
        const options = roundRobinGetter(this.instances);
        proxySocket.connect(options);
        socket.on('data', (data) => {
          proxySocket.write(data);
        });
        proxySocket.on('data', ( data ) => {
          socket.write(data);
        });
        socket.on('error', (error) => {
          console.log({error})
        });
        proxySocket.on('error', (error) => {
          console.log({error})
        });
        proxySocket.on('close', () => {
          socket.end()
        });
        socket.on('close', () => {
          proxySocket.end()
        });
      } catch ( error ) {
        socket.end();
      }
    });
    this.proxyServer.listen(options.port);
  }
}
