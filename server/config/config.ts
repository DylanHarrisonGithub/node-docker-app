import path from 'path';
import crypto from 'crypto';

const APPNAME = 'NODEDOCKERAPP';

const secret = crypto.randomBytes(64).toString('hex');

const env = process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT';

const config = {
  SERVER_SECRET: env === 'DEVELOPMENT' ? 'abcdefg' : process.env[`${APPNAME}_SERVER_SECRET`] || secret,
  DATABASE_URL: process.env[`${APPNAME}_DATABASE_URL`] || '',
  APPNAME: APPNAME,
  ENVIRONMENT: process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT',
  SOCKET_CONNECT_PRIVELEGE: ['guest', 'user', 'admin'],
  ROOT_DIR: path.normalize(__dirname + `/../../`),
  PORT: process.env[`${APPNAME}_PORT`] || 3000,
  ROOT_URL: '/',
  ERROR_URL: '/error',
  NODEMAILER: {
    EMAIL: process.env[`${APPNAME}_NODEMAILER_EMAIL`] || '',
    PASSWORD: process.env[`${APPNAME}_NODEMAILER_PASSWORD`] || ''
  },
  GOOGLE_API_KEY: process.env[`${APPNAME}_GOOGLE_API_KEY`],
  ADMIN_EMAIL: process.env[`${APPNAME}_ADMIN_EMAIL`] || '',
  MAX_HD_SIZE_GB: process.env[`${APPNAME}_MAX_HD_SIZE_GB`] || 20,
  REPOSITORY: {
    URL: process.env[`${APPNAME}_REPO_URL`],
    BRANCH: process.env[`${APPNAME}_REPO_BRANCH`] || 'main',
    PAT: process.env[`${APPNAME}_REPO_PAT`],
    SECRET: process.env[`${APPNAME}_REPO_SECRET`]
  },
  DOCKER: {
    DOCKER_CONTAINER_NAME: process.env[`${APPNAME}_DOCKER_CONTAINER_NAME`],
    DOCKER_IMAGE: process.env[`${APPNAME}_DOCKER_IMAGE`],
    DOCKER_REGISTRY_AUTH: process.env[`${APPNAME}_DOCKER_REGISTRY_AUTH`]
  },
  PROTECTED_FOLDERS: [
    'public',
    'public/media',
    'public/tracks',
    'public/static',
  ]
};

export default config;