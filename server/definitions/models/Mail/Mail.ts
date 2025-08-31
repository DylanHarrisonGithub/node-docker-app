import { Model } from '../models';
import Schemas from '../../schemas/schemas';
import { Schema, COMMON_REGEXES } from '../../../../server/services/validation/validation.service';

import { PSQLTable } from '../models';

export type Mail = {
  id: number,
  email: string,
  code: string,
  salt: string,
  verified: string
}

const mailTable = {
  id: `SERIAL`,
  email: `TEXT`,
  code: `TEXT`,
  salt: `TEXT`,
  verified: `TEXT`,
  PRIMARY: `KEY (id)`
} satisfies PSQLTable;

const MailModel: Model<typeof mailTable, Mail> = {
  db: mailTable,

  schema: {
    email: Schemas.email
  }
}

export default MailModel;