import db from './db/db.service';
import file from './file/file.service';
import requestParser from './requestParser/requestParser.service';
import authentication from './authentication/authentication.service';
import router from './router/router.service';
import validation from './validation/validation.service';
import email from './email/email.service';

export type ServicePromise<T=any> = Promise<{
  success: boolean, messages: string[], body?: T
}>;

export type Service = (
  (<T=any>(...args: any[]) => ServicePromise<T | any>) | 
  { [key: string]: Service }
);

// syntactic hack to mandate that services conform to Service type
// const services = ((): typeof service extends Service ? typeof service : never => {
//   const service = {
//     db: db,
//     file: file,
//     authentication: authentication,
//     requestParser: requestParser,
//     validation: validation,
//     router: router,
//     email: email
//   }
//   return service;
// })();

const services = {
  db: db,
  file: file,
  authentication: authentication,
  requestParser: requestParser,
  validation: validation,
  router: router,
  email: email
} satisfies Service;

export default services;