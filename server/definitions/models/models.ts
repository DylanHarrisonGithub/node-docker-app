import { COMMON_REGEXES, Schema } from "../../../server/services/validation/validation.service";
import UserModel, { User } from './User/User';
import MailModel, { Mail } from './Mail/Mail';
import ThemeModel, { Theme } from "./Theme/theme";

import { dbTypes } from "../data/data";

const unionRegex = (...regexes: RegExp[]) => new RegExp(regexes.map(regex => regex.source).join("|"));

type PostgresDataType = 
| `BIGINT` | `BOOLEAN` | `BYTEA` | `CHAR(${number})` | `CHARACTER(${number})` 
| `CIDR` | `CIRCLE` | `DATE` | `DECIMAL(${number}, ${number})` | `DOUBLE PRECISION` | `INTEGER` 
| `INTEGER[]` | `JSON` | `JSONB` | `JSON[]` | `JSONB[]` | `LINE` | `LSEG` | `MACADDR` 
| `NAME` | `NUMERIC` | `NUMERIC(${number}, ${number})` | `OID` | `PATH` | `PG_LSN` | `POINT` | `POLYGON` 
| `REAL` | `REGCLASS` | `REGNAMESPACE` | `REGOPERATOR` | `REGPROCEDURE` | `REGPROC` | `REGROLE` 
| `REGTYPE` | `REGUSER` | `SERIAL` | `TEXT` | `TEXT[]` | `TIME` | `TIME WITH TIME ZONE` 
| `TIMESTAMP` | `TIMESTAMP WITH TIME ZONE` | `TIMESTAMP WITHOUT TIME ZONE` | `TIMESTAMPTZ` | `TSQUERY` 
| `TSVECTOR` | `UUID` | `UUID[]` | `VARCHAR(${number})` | `VARCHAR(${number})[]` | `BOOLEAN[]` 
| `INTERVAL` | `REAL` | `SMALLINT` | `SERIAL` | `BIGSERIAL` | `INTEGER[]`;

type PSQLConstraint =
  | `SERIAL`
  | `CONSTRAINT ${string}` // For named constraints
  | `PRIMARY KEY` 
  | `FOREIGN KEY (${string}) REFERENCES ${string} (${string})` // For foreign keys with column references
  | `UNIQUE` // For unique constraints on columns
  | `CHECK (${string})` // For check constraints with expressions
  | `NOT NULL` // For not null constraints
  | `EXCLUDE (${string}) USING ${string}` // For exclusion constraints
  | `DEFAULT ${string}` // For default value constraints
  | `INDEX (${string})`; // For index constraints

type PSQLConstraints = 
  | `${PSQLConstraint}`
  | `${PSQLConstraint} ${PSQLConstraint}`
  | `${PSQLConstraint} ${PSQLConstraint} ${PSQLConstraint}`;

type PSQLColumnDefinition = `${PostgresDataType}` | `${PostgresDataType} ${PSQLConstraints}`;

export type PSQLTable = { PRIMARY: `KEY (${string})` } | ({ [key: string]: PSQLColumnDefinition } & { PRIMARY: `KEY (${string})` });

export type Model<U extends PSQLTable, V> = {
  schema: Schema,
  db: U,
  toDB?: (model: Partial<V>) =>  Partial<{ [key in keyof U]: any}>,
  fromDB?: (dbRes: { [key in keyof U]: any}) => { [k in keyof V]: any }//Partial<V>//Partial<{ [key in keyof V]: any }>,
}

export type ModelTypes = {
  User: User,
  Mail: Mail,
  Contact: Contact,
  Theme: Theme,
}

const ServerModels: { [key: string]: Model<any, any> } = {
  user: UserModel,
  mail: MailModel,
  theme: ThemeModel,
}

export default ServerModels;


// const UserTable = {
//   id: `INTEGER SERIAL UNIQUE`,
//   username: `VARCHAR(48) UNIQUE`,
//   PRIMARY: `KEY (id)`
// } as const satisfies PSQLTable;

// type TestModel = {
//   a: string,
//   b: string
// }
// const dbTestModel = { 
//   a: 'TEXT',
//   b: 'TEXT',
//   PRIMARY: `KEY (a)`
// } as const satisfies PSQLTable;

// const dbTestModelSchema = {
//   a: { type: 'string', attributes: { required: true} },
//   b: { type: 'string', attributes: { required: true} }
// } as const satisfies Schema;

// const myModel: NewModel<typeof dbTestModel, typeof dbTestModelSchema, TestModel> = {
//   db: dbTestModel,
//   schema: dbTestModelSchema,
//   mapToDB: (model: Partial<TestModel>) => ({ a: model.a, b: model.b, q: 'hui' }), // q should fail
//   mapFromDB: (dbRes: Partial<Record<keyof typeof dbTestModel, any>>) => ({ a: dbRes.a, b: dbRes.b })
// }

// export type Model = {
//   db?: { PRIMARY: `KEY (${string})` } | { [key: string]: string } & { PRIMARY: any } //{ [key: string]: typeof dbTypes[number] }
//   schema: Schema,
//   toDB?: (model: any) => any
//   fromDB?: (dbModel: any) => any
// }