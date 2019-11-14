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
          proxySocket.write(data.toString());
        });

        proxySocket.on('data', ( data ) => {
          socket.write(data.toString());
        });

        socket.on('error', (error) => {
        });

        proxySocket.on('error', (error) => {
        });

        proxySocket.on('close', () => {
          socket.end()
        });

        socket.on('close', () => {
          proxySocket.end()
        });

      } catch ( error ) {

        console.log({ error });
        socket.end();

      }
    });

    this.proxyServer.listen(options.port);
  }
}
