import server from '../../server';
import { Service, ServicePromise } from '../services';

import db from '../db/db.service';
import config from '../../config/config';
import file from '../file/file.service';
import email from '../email/email.service';
import { User } from '../../definitions/models/User/User';

import crypto from 'crypto';

const maintenance = {

  // full db delete
  dbDelete: async (): ServicePromise => {
    let success = true;
    let messages: string[] = [];
    console.log('SERVER - SERVICES - MAINTENANCE - DB Delete - Deleting all database tables.');

    let res;
    for (const key of Object.keys(server.models)) {
      res = await db.table.delete(key);
      success = success && res.success;
      messages = [...messages, ...res.messages];
    }
    return new Promise(resolve => resolve({
      success: success,
      messages: [
        success ? 
            `SERVER - SERVICES - MAINTENANCE - DB Delete - All database tables deleted.` 
          : 
            `SERVER - SERVICES - MAINTENANCE - DB Delete - Error deleting database tables.`,
        ...messages
      ]
    })) as ServicePromise;
  },

  dbCreate: async (): ServicePromise => {
    let success = true;
    let messages: string[] = [];
    console.log('SERVER - SERVICES - MAINTENANCE - DB Create - Creating all database tables.');

    let res;
    for (const key of Object.keys(server.models)) {
      res = await db.table.create(key, (<any>server.models)[key].db);
      success = success && res.success;
      messages = [...messages, ...res.messages];
    }

    // add any missing columns to tables
    let dbtable: { column_name: string, data_type: string }[] | undefined;
    for (const key of Object.keys(server.models)) {
      dbtable = (await db.table.read<{ column_name: string, data_type: string }[]>(key)).body;
      if (dbtable) {
        let { PRIMARY, ...tabledef } = (<any>server.models)[key].db;
        for (const tdcolumn of Object.keys(tabledef)) {
          if (!dbtable!.filter(dbv => dbv.column_name.toLowerCase() === tdcolumn.toLowerCase()).length) {
            messages = [...messages, `Warning: database definition for table ${key} is missing column ${tdcolumn} as defined by this application for ${key} table!`];
            messages = [...messages, `Adding column ${tdcolumn} to table ${key} as defined by this application..`];
            let res = await db.table.update(key, { add: { [tdcolumn]: tabledef[tdcolumn] }});
            success = success && res.success;
            messages = [...messages, ...res.messages];
          }
        }
      }
    }

    return new Promise(resolve => resolve({
      success: success,
      messages: [
        success ? 
            `SERVER - SERVICES - MAINTENANCE - DB Create - All database tables created.` 
          : 
            `SERVER - SERVICES - MAINTENANCE - DB Create - Error creating database tables.`,
        ...messages
      ]
    })) as ServicePromise;
  },

  buildProtectedFolders: async (): ServicePromise => {
    let success = true;
    let messages: string[] = [];
    messages = ['SERVER - SERVICES - MAINTENANCE - Build Protected Folders - Creating protected folders if they do not already exist.']; 
    for (const folder of config.PROTECTED_FOLDERS) {
      const res = await file.createDirectory(folder);
      success = success && res.success;
      messages = [...messages, ...res.messages];
    }
    return new Promise(resolve => resolve({
      success: success,
      messages: [
        success ? 
            `SERVER - SERVICES - MAINTENANCE - Build Protected Folders - All protected folders created.` 
          : 
            `SERVER - SERVICES - MAINTENANCE - Build Protected Folders - Error creating protected folders.`,
        ...messages
      ]
    })) as ServicePromise;
  },

  generateUser: async (privilege: string = 'admin'): ServicePromise => {

    let success: boolean = true;
    let messages: string[] = [];

    messages = [...messages, 'SERVER - SERVICES - MAINTENANCE - Generate User - Generating user with privilege', privilege];

    const newUser = {
      username: privilege + Math.random().toString(36).slice(2),
      email: config.ADMIN_EMAIL,
      password: 'p' + Math.random().toString(36).slice(2),
    };

    const salt = crypto.randomBytes(32).toString('hex');
    const hash = await crypto.pbkdf2Sync(newUser.password, salt, 32, 64, 'sha512').toString('hex');

    const res = await db.row.create('user', { 
      username: newUser.username,
      email: newUser.email,
      privilege: privilege, 
      password: hash, 
      salt: salt, 
      avatar: ``,
      reset: ``,
      resetstamp: `0`,
      tries: 0
    });

    success = success && res.success;
    messages = [...messages, ...res.messages];

    if (res.success) {
      messages = [...messages, 'SERVER - SERVICES - MAINTENANCE - Generate User - Temporary admin account created'];
      messages = [...messages, JSON.stringify(newUser)];
      messages = [...messages, 'SERVER - SERVICES - MAINTENANCE - Generate User - Please use this account to register a permanent admin account and then delete the temporary one.'];
      const emailRes = await email(newUser.email, 'Temporary Login', `${JSON.stringify(newUser)}`);
      success = success && emailRes.success;
      messages = [...messages, ...emailRes.messages];
      return new Promise(resolve => resolve({
        success: success,
        messages: messages
      })) as ServicePromise;
    } else {
      console.log('Error: Failed to create temporary admin account');
      console.log('Failed attempt produced the following message(s)');
      return new Promise(resolve => resolve({
        success: false,
        messages: [
          `SERVER - SERVICES - MAINTENANCE - Generate User - Error creating temporary user.`,
          ...res.messages
        ]
      })) as ServicePromise;
    }
  },

  dockerUpdate: async (): ServicePromise => {

    const { DOCKER_IMAGE, DOCKER_CONTAINER_NAME, DOCKER_REGISTRY_AUTH } = config.DOCKER;

    if (!DOCKER_IMAGE || !DOCKER_CONTAINER_NAME || !DOCKER_REGISTRY_AUTH) {
      return Promise.resolve({
        success: false,
        messages: [
          'SERVER - SERVICES - MAINTENANCE - Update - Docker image or container name not configured. Cannot perform update.'
        ]
      });
    };

    let success = true;
    let messages: string[] = [];

    try {
      messages.push('Checking for updates to Docker image...');

      // Get current image digest
      const execSync = (await import('child_process')).execSync;
      const currentDigest = execSync(
        `docker inspect --format='{{index .RepoDigests 0}}' ${DOCKER_CONTAINER_NAME}`,
        { encoding: 'utf8' }
      ).trim();

      // Get latest remote image digest
      const latestDigest = execSync(
        `docker pull ${DOCKER_IMAGE} --quiet && docker inspect --format='{{index .RepoDigests 0}}' ${DOCKER_IMAGE}`,
        { encoding: 'utf8' }
      ).trim();

      messages.push(`Current image digest: ${currentDigest}`);
      messages.push(`Latest image digest: ${latestDigest}`);

      if (currentDigest === latestDigest) {
        messages.push('Server is up to date with the latest Docker image.');
      } else {
        messages.push('New Docker image available. Updating server...');

        // Stop and remove current container
        execSync(`docker stop ${DOCKER_CONTAINER_NAME}`);
        execSync(`docker rm ${DOCKER_CONTAINER_NAME}`);

        // Start new container with latest image
        execSync(
          `docker run -d --name ${DOCKER_CONTAINER_NAME} ${DOCKER_IMAGE}`
        );

        messages.push('Server updated and restarted with the latest Docker image.');
      }
    } catch (error: any) {
      success = false;
      messages.push('Error during update process: ' + error.message);
    }

    return Promise.resolve({
      success,
      messages
    });
  },

  repoUpdate: async (): ServicePromise => {

    const { URL, BRANCH, PAT } = config.REPOSITORY;
    const REPO_PATH = config.ROOT_DIR;

    if (!REPO_PATH || !URL || !BRANCH || !PAT) {
      return Promise.resolve({
        success: false,
        messages: [
          'SERVER - SERVICES - MAINTENANCE - Update - Repository path, URL, branch, or PAT not configured. Cannot perform update.'
        ]
      });
    }

    let success = true;
    let messages: string[] = [];

    try {
      messages.push('Checking for updates to GitHub repository...');
      const execSync = (await import('child_process')).execSync;

      // Set up git remote with PAT if needed
      execSync(`git remote set-url origin https://${PAT}@${URL.replace('https://', '')}`, { cwd: REPO_PATH });

      // Fetch latest changes from the specified branch
      execSync(`git fetch origin ${BRANCH}`, { cwd: REPO_PATH });

      // Get local and remote commit hashes
      const localCommit = execSync(`git rev-parse HEAD`, { cwd: REPO_PATH, encoding: 'utf8' }).trim();
      const remoteCommit = execSync(`git rev-parse origin/${BRANCH}`, { cwd: REPO_PATH, encoding: 'utf8' }).trim();

      messages.push(`Local commit: ${localCommit}`);
      messages.push(`Remote commit: ${remoteCommit}`);

      if (localCommit === remoteCommit) {
        messages.push('Repository is up to date with GitHub.');
      } else {
        messages.push('New updates found in GitHub repository. Pulling latest changes...');
        execSync(`git pull origin ${BRANCH}`, { cwd: REPO_PATH });
        messages.push('Running npm install...');
        execSync(`npm install`, { cwd: REPO_PATH });
        messages.push('Stopping index.js process via pm2...');
        execSync(`pm2 stop index.js`);
        messages.push('Repository updated and index.js process stopped.');
      }
    } catch (error: any) {
      success = false;
      messages.push('Error during repository update process: ' + error.message);
    }

    return Promise.resolve({
      success,
      messages
    });
  }
  


} satisfies Service;

export default maintenance;
