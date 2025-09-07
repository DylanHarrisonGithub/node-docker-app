import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import fileUpload from 'express-fileupload';
import path from 'path';
import os from 'os';

import server from './server/server';
import db from './server/services/db/db.service';
import config from './server/config/config';
import file from './server/services/file/file.service';

import { User } from './server/definitions/models/User/User';

import maintenance from './server/services/maintenance/maintenance.service';
import monitoring, { TrafficStats, AbuseDetectionReport } from './server/services/monitoring/monitoring.service';

const stats: TrafficStats = {
  daily: {},
  monthly: {}
};

const trafficThresholds = {
  maxTotalIngress: 1 * 1024 * 1024 * 1024,    // 1GB per day
  maxTotalEgress: 1 * 1024 * 1024 * 1024,     // 1GB per day
  maxIngressPerIp: 100 * 1024 * 1024,    // 100MB per IP per day
  maxEgressPerIp: 100 * 1024 * 1024,     // 100MB per IP per day
  maxRequestsPerIp: 10000,   // 10000 requests per IP per day
  maxRequestsPerSecondPerIp: 50 // 50 requests per second per IP
};

const intervalObject = {
  lastPruneTime: 0,
  lastFullCheckTime: 0
}

const prevTraffic: {
  timestamp: number,
  ip: string | null,
  requests: number
  requestsPerSecond: number
} = {
  timestamp: 0,
  ip: null,
  requests: 0,
  requestsPerSecond: 0
};

const app = express();

app.use(cors({ credentials: true }));

app.use(async (req, res, next) => {
  const monitoringRes = await monitoring.useMonitoring(
    req, 
    res,
    stats, 
    trafficThresholds,
    60000,  // 10 minutes
    360000, // 1 day
    {
      daysToKeep: 7,
      monthsToKeep: 3,
      ipsToKeep: 1000
    },
    intervalObject
  );

  if (!monitoringRes.success && monitoringRes.body) {
    console.log('Abuse detected: ', monitoringRes.body);
  }
  // console.log('monitoring report: ', monitoringRes);
  // console.dir(stats, { depth: null });
  next();
});

app.use(express.json());
app.use(cookieParser());
app.use(fileUpload());
app.use(express.urlencoded({extended: true}));
app.use('/api', async (request: express.Request, response: express.Response) => {

  let parsedRequest = await server.services.requestParser(request);

  // console.log('request params: ', parsedRequest.body?.params);

  if (parsedRequest.success && parsedRequest.body) {

    let routerResponse = await server.services.router(parsedRequest.body!);
    let res = routerResponse.body!;
  
    Object.keys(res.headers || {}).forEach(key => response.setHeader(key, res.headers![key]));

    console.log([
      `ip: ${parsedRequest.body.ip}`,
      `timestamp: ${parsedRequest.body.timestamp}`,
      `route: ${parsedRequest.body.route}`,
      ...parsedRequest.messages,
      ...(res.json?.messages || routerResponse.messages)
    ]);
    
    if (res.json) {
      
      //res.json.messages = [...res.json.messages, ... parsedRequest.messages];
      response.status(res.code).json(res.json);
    } else if (res.html) {
      response.status(res.code).send(res.html);
    } else if (res.filename) {
      response.status(res.code).sendFile(res.filename);
    } else if (res.redirect) {
      response.redirect(res.redirect);
    } else {
      response.sendStatus(res.code);
    }

  } else {
    console.log(parsedRequest.messages);
    response.status(400).json({
      success: false,
      messages: [...parsedRequest.messages]
    });
  }

});
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'client')));
// app.get('/{*splat}', (req, res) => res.sendFile(path.resolve(__dirname, './client', 'index.html')))

app.listen(config.PORT || 3000, async () => {
  
  // create database tables if they don't already exist
  if (config.DATABASE_URL?.length) {
    console.log(`Building database tables if they don't already exist...`);
    console.log((await maintenance.dbCreate()).messages);
  } else {
    console.log('No database configured, skipping db table creation');
  }

  // create a default admin user if none exist
  if (config.DATABASE_URL?.length) {
    console.log('Checking if admin user exists...');
    const userRes = await db.row.read<User[]>('user', { privilege: 'admin' });
    if (!userRes.body?.length) {
      console.log('No admin user found. Creating new one')
      console.log((await maintenance.generateUser('admin')).messages);
    }
  }

  // set the git repository remote origin if configured
  if (config.REPOSITORY.URL) {
    console.log(`Setting repository remote origin...`);
    console.log((await maintenance.setRepoRemote()).messages);
  }

  console.log('root size: ', await file.getDirectorySize(''));
  console.log('host: ' + os.hostname());
  // console.log('config: \n', config);  // probably safe but nah..

  console.log(`${config.APPNAME} listening on port ${config.PORT || 3000}`);

});