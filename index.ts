import express from 'express';
import * as exec from 'child_process';
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
import crypto from 'crypto';
import email from './server/services/email/email.service';

const app = express();

app.use(cors({ credentials: true }));
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
app.get('/*', (req, res) => res.sendFile(path.resolve(__dirname, './client', 'index.html')))

app.listen(config.PORT || 3000, async () => {

  // full db delete
  // console.log('db reset is on')
  // for (const key of Object.keys(server.models)) {
  //   console.log((await db.table.delete(key)).messages);
  // }
  
  // //!!!! uncomment before deploying !!!!
  // create db tables if they don't already exist
  for (const key of Object.keys(server.models)) {
    console.log((await db.table.create(key, (<any>server.models)[key].db)).messages);
  }

  // add any missing columns to tables
  let dbtable: { column_name: string, data_type: string }[] | undefined;
  for (const key of Object.keys(server.models)) {
    dbtable = (await db.table.read<{ column_name: string, data_type: string }[]>(key)).body;
    if (dbtable) {
      let { PRIMARY, ...tabledef } = (<any>server.models)[key].db;
      for (const tdcolumn of Object.keys(tabledef)) {
        if (!dbtable!.filter(dbv => dbv.column_name.toLowerCase() === tdcolumn.toLowerCase()).length) {
          console.log(`Warning: database definition for table ${key} is missing column ${tdcolumn} as defined by this application for ${key} table!`);
          console.log(`Adding column ${tdcolumn} to table ${key} as defined by this application..`);
          let res = await db.table.update(key, { add: { [tdcolumn]: tabledef[tdcolumn] }});
          console.log('here is the result of that..', res.messages)
        }
      }
    }
  }

  // create a default admin user if none exist
  const userRes = await db.row.read<User[]>('user');
  if (!userRes.body?.length) {
    const admin = {
      username: 'admin' + Math.random().toString(36).slice(2),
      email: config.ADMIN_EMAIL,
      password: 'p' + Math.random().toString(36).slice(2),
    }

    const salt = crypto.randomBytes(32).toString('hex');
    const hash = await crypto.pbkdf2Sync(admin.password, salt, 32, 64, 'sha512').toString('hex');
  
    const res = await db.row.create('user', { 
      username: admin.username,
      email: admin.email,
      privilege: 'admin', 
      password: hash, 
      salt: salt, 
      avatar: ``,
      reset: ``,
      resetstamp: `0`,
      tries: 0
    });

    if (res.success) {
      console.log('Temporary admin account created');
      console.log(admin);
      console.log('Please use this account to register a permanent admin account and then delete the temporary one.');
      console.log(await email(admin.email, 'Temporary Login', `${JSON.stringify(admin)}`));
    } else {
      console.log('Error: Failed to create temporary admin account');
      console.log('Failed attempt produced the following message(s)');
      console.log(res.messages);
    }
  }


  if (config.REPOSITORY.URL) {
    try {
      const res = exec.execSync(`sudo git remote set-url origin https://${config.REPOSITORY.PAT ? config.REPOSITORY.PAT + '@' : ''}${config.REPOSITORY.URL}`);
    } catch (e) {
      console.log(['failed to set git remote url', e])
    }
  }

  console.log('root size: ', await file.getDirectorySize(''));
  console.log('host: ' + os.hostname());
  // console.log('config: \n', config);  // probably safe but nah..

  console.log(`${config.APPNAME} listening on port ${config.PORT || 3000}`);

});