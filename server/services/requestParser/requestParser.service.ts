import express from 'express';
import * as url from 'url';

import { Service, ServicePromise } from '../services';

export type ParsedRequest<T = any> = {
  ip: string,
  timestamp: number,
  method: string,
  accepts: string,
  host: string,
  route: string,
  token: any,
  params: T,
  files: any
}

const requestParser = ((): typeof service extends Service ? typeof service : never => {
  const service = (req: express.Request): ServicePromise<ParsedRequest> => {
    let token: string | string[] | null = null;
    if (req.cookies['token']) { token = req.cookies.token };
    if (!token && req.headers['token']) { token = req.headers.token };
    
    let route = "";
    if (req.url) {
      let parsed = url.parse(req.url).pathname;
      if (parsed) {
        // route = parsed.split('/').join('-').substring(1);
        route = parsed.substring(1);
        if (route.startsWith('api/')) {
          route = route.substring(4);
        }
      }
    }

    let ip = '';
    if (Array.isArray(req.headers['x-forwarded-for'])) {
      ip = (<string[]>(req.headers['x-forwarded-for']))[0];
    } else {
      ip = <string>(req.headers['x-forwarded-for']);
    }
    if (req.socket.remoteAddress) {
      ip = ip || (<string>(req.socket.remoteAddress));
    }
    
    return new Promise(resolve => resolve({
      success: true,
      messages: [`SERVER - Services - RequestParser - Request parsed successfully.`],
      body: {
        ip: ip,
        timestamp: Date.now(),
        method: req.method,
        accepts: req.get('Accept') || '', //req.get('Accept')?.split(',').map(type => type.indexOf(';') > -1 ? type.substring(0, type.lastIndexOf(';')).split('/') : type.split('/') ) || [],
        route: route,
        host: req.get('Host') || '',
        token: token,
        params: (req.method === 'GET' || req.method === 'DELETE') ? req.query : req.body,
        files: req.files
      }
    }));
  }
  return service;
})();


export default requestParser;