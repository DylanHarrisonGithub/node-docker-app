import { Model } from '../models';
import Schemas from '../../schemas/schemas'
import { Schema, COMMON_REGEXES } from '../../../../server/services/validation/validation.service';

import { PSQLTable } from '../models';

export type User = {
  id: number,
  username: string,
  email: string,
  password: string,
  privilege: string,
  salt: string,
  avatar: string,
  avatarGoogleMedia?: { id: string, mimeType: string, width: number, height: number },
  reset: string,
  resetstamp: string,
  tries: number
}

const userTable = {
  id: `SERIAL`,
  username: 'TEXT UNIQUE',
  email: `TEXT`,
  privilege: `TEXT`,
  password: 'TEXT',
  salt: 'TEXT',
  avatar: `TEXT`,
  avatargooglemedia: `TEXT`,
  reset: `TEXT`,
  resetstamp: `TEXT`,
  tries: `NUMERIC`,
  PRIMARY: 'KEY (id)' 
} satisfies PSQLTable;

const userSchema = {
  ...(({ id, username, email, password, otp, privilege }) => ({ id, username, email, password, otp, privilege }))(Schemas),
  avatar: { type: 'string', attributes: { required: true }}, //Schemas.imageFilename,
  avatarGoogleMedia: {
    type: {
      id: { type: 'string', attributes: { required: true } },
      mimeType: { type: 'string', attributes: { required: true } },
      width: { type: 'string | number', attributes: { required: true } },
      height: { type: 'string | number', attributes: { required: true } },
    },
    attributes: { required: false }
  }
} satisfies Schema;

const UserModel: Model<typeof userTable, User> = {

  db: userTable,

  schema: userSchema,

}

export default UserModel;