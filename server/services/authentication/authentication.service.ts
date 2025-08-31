import jwt, { } from 'jsonwebtoken';
import crypto from 'crypto';

import config from '../../config/config';
// import server from '../../server';

import { Service, ServicePromise } from '../services';

const authentication = ((): typeof service extends Service ? typeof service : never => {
  const service = {
    generateToken: (data: Object): ServicePromise<string> => new Promise(resolve => resolve({
      success: true,
      messages: [`Server - Services - Authentication - GenerateToken: Successfully generated token.`],
      body: jwt.sign(data, config.SERVER_SECRET)
    })),
    verifyToken: (token: string): ServicePromise => new Promise(resolve => {
      try {
        let decoded = jwt.verify(token, config.SERVER_SECRET);
        resolve({
          success: true,
          messages: [`Server - Services - Authentication - VerifyToken: Successfully verified token.`],
          body: decoded
        });
      } catch { 
        resolve({
          success: false,
          messages: [`Server - Services - Authentication - VerifyToken: Could not verify token.`]
        });
      }
    }),
    decodeToken: (token: string): ServicePromise<any> => new Promise(resolve => {
      try {
        let decoded = jwt.decode(token);
        resolve({
          success: true,
          messages: [`Server - Services - Authentication - DecodeToken: Successfully decoded token.`],
          body: decoded
        });
      } catch {
        resolve({
          success: false,
          messages: [`Server - Services - Authentication - DecodeToken: Could not decode token.`]
        })
      }
    }),
    generateTimeToken: (data: Object | null): ServicePromise<string> => new Promise(resolve => { 
      let now = Math.floor(Date.now() / 60000);
      now = now - (now % 10);
      let payload = now.toString() + config.SERVER_SECRET;
      if (data) { payload = JSON.stringify(data) + payload; }
      resolve({
        success: true,
        messages: [`Server - Services - Authentication - GenerateTimeToken: Successfully generated timed token.`],
        body: crypto.createHash('md5').update(payload).digest('hex').substring(0, 6)
      });
    }),
    verifyTimeToken: (data: Object | null, token: string, ttlMinutes?: number): ServicePromise => new Promise(resolve => {
      let ttl = 10;
      let now = Math.floor(Date.now() / 60000);
      now = now - (now % 10);
      let payload = now.toString() + config.SERVER_SECRET;
      if (data) { payload = JSON.stringify(data) + payload; }
  
      if (ttlMinutes && ttlMinutes > 10) {
        ttl = ttlMinutes;
      }
      let verified = false;
      let nowhash = "";
      while (ttl > 0) {
        nowhash = crypto.createHash('md5').update(payload).digest('hex').substring(0, 6);
        if (nowhash === token) { verified = true; }
        ttl -= 10;
        now -= 10;
      }
      resolve({
        success: verified,
        messages: [
          verified ?
            `Server - Services - Authentication - VerifyTimeToken: Successfully verified timed token.`
          :
          `Server - Services - Authentication - VerifyTimeToken: Could not verify timed token.`
        ]
      });
    })
  }
  return service;
})();
export default authentication;