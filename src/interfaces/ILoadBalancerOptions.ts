import {IProxyInstanceParams} from './IProxyInstanceParams';

export interface ILoadBalancerOptions {
  port: number,
  instances: IProxyInstanceParams[]
}
