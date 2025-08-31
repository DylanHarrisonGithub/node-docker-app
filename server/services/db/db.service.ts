import pg from 'pg';

import { Service, ServicePromise } from '../services';

import config from '../../config/config';

const quoteString = (val: string | number | boolean): string | number | boolean => (typeof val === 'string') ? "'"+escape(val)+"'" : val;
const escape = (v: string) => v.replace(/'/g, `''`);
const unescape = (v: string) => v.replace(/''/g, `'`);
const unescapeRows = (rows: any) => (rows as { [key:string]: any }[]).map(row => Object.keys(row).reduce((acc, key) => 
  typeof row[key] === 'string' ? 
    { [key]: unescape(row[key]), ...acc}
  :
    { [key]: row[key], ...acc}  , {} as { [key:string]: any })
);

const db = ((): typeof service extends Service ? typeof service : never => {
  const service = {
    row: {
      create: async <T = void>(table: string, row: { [key: string]: string | number | boolean }): ServicePromise<T> => {
        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `INSERT INTO "${table}" (${
            Object.keys(row).map((key, index) => index !== Object.keys(row).length -1 ? key + ', ' : key).join("")
          }) VALUES (${
            Object.keys(row).map((key, index) => index !== Object.keys(row).length -1 ? quoteString(row[key]) + ', ' : quoteString(row[key])).join("")
        }) RETURNING *;`;
        try {
          await client.connect();
          const result = <T>(((await client.query(query)).rows as unknown[])[0]);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Create - Successfully inserted into table ${table}.`, 
              `SERVER - DBService - Row - Create - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Create - Error attempting to insert row into table ${table}.`,
              `SERVER - DBService - Row - Create - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      read: async <T = void>(
        table: string, 
        where?: { [key: string]: string | number | boolean }
      ): ServicePromise<T> => {
        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `SELECT * FROM "${table}"${
          (where && Object.keys(where).length) ? 
            ` WHERE ` + 
            Object.keys(where).map((key, index) => index !== Object.keys(where).length -1 ? 
              key + ` = ` + quoteString(where[key]) + ` AND `
            :
              key + ` = ` + quoteString(where[key])
            ).join("")
          : `` 
        };`;
        try {
          await client.connect();
          const result = <T>(unescapeRows((await client.query(query)).rows) as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Read - Rows successfully selected from table ${table}.`, 
              `SERVER - DBService - Row - Read - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Read - Error attempting to select from table ${table}.`,
              `SERVER - DBService - Row - Read - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      stream: async <T = void>(
        table: string, 
        afterID: number,
        numrows: number,
        where?: { [key: string]: string | number | boolean }
      ): ServicePromise<T> => {
        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = 
        `SELECT * FROM "${table}" WHERE id > ${
          afterID
        }${
          (where && Object.keys(where).length) ? 
            ` AND ` + 
            Object.keys(where).map((key, index) => index !== Object.keys(where).length -1 ? 
              key + ` = ` + quoteString(where[key]) + ` AND `
            :
              key + ` = ` + quoteString(where[key])
            ).join("")
          : `` 
        } ORDER BY id ASC LIMIT ${numrows};`;
        try {
          await client.connect();
          const result = <T>(unescapeRows((await client.query(query)).rows) as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Stream - Rows successfully streamed from table ${table}.`, 
              `SERVER - DBService - Row - Stream - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Stream - Error attempting to stream from table ${table}.`,
              `SERVER - DBService - Row - Stream - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      update: async <T=void>(
        table: string, 
        columns: { [key: string]: string | number | boolean }, 
        where?: { [key: string]: string | number | boolean }
      ): ServicePromise<T> => {
        
        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `UPDATE "${table}" SET ${
          Object.keys(columns).map((key, index) => index !== Object.keys(columns).length -1 ? 
              key + ` = ` + quoteString(columns[key]) + `, `
            :
              key + ` = ` + quoteString(columns[key])
            ).join("")
          } ${
            (where && Object.keys(where).length) ? 
              `WHERE ` + 
              Object.keys(where).map((key, index) => index !== Object.keys(where).length -1 ? 
                key + ` = ` + quoteString(where[key]) + ` AND `
              :
                key + ` = ` + quoteString(where[key])
              ).join("")
            : `` 
        };`;

        if (!(Object.keys(columns).length)) {
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Update - No updates were provided for table ${table}.`,
              `SERVER - DBService - Row - Update - Query: ${query}`
            ]
          }
        }

        try {
          await client.connect();
          const result = <T>((unescapeRows((await client.query(query)).rows) as unknown[])[0]);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Update - Row(s) successfully updated in table ${table}.`, 
              `SERVER - DBService - Row - Update - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Update - Error attempting to update row(s) in table ${table}.`,
              `SERVER - DBService - Row - Update - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }  
      },

      delete: async (table: string, where?: { [key: string]: string | number | boolean }): ServicePromise => {

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `DELETE FROM "${table}"${
          (where && Object.keys(where).length) ? 
            ` WHERE ` + 
              Object.keys(where).map((key, index) => index !== Object.keys(where).length -1 ? 
                key + ` = ` + quoteString(where[key]) + ` AND `
              :
                key + ` = ` + quoteString(where[key])
              ).join("")
          : `` 
        };`;
        try {
          await client.connect();
          await client.query(query);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Delete - Row(s) successfully deleted in table ${table}.`, 
              `SERVER - DBService - Row - Delete - Query: ${query}`
            ]
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Delete - Error attempting to delete row(s) in table ${table}.`,
              `SERVER - DBService - Row - Delete - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      query: async <T = void>(query: string): ServicePromise<T> => {

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        try {
          await client.connect();
          const result = <T>(unescapeRows((await client.query(query)).rows) as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Row - Query - Query successfully executed.`,
              `SERVER - DBService - Row - Query - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          return {
            success: false,
            messages: [
              `SERVER - DBService - Row - Query - Query did not execute successfully.`,
              `SERVER - DBService - Row - Query - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      }
    },

    table: {

      create: async <T=void>(table: string, columns: { [key: string]: string }): ServicePromise<T> => {

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `CREATE TABLE IF NOT EXISTS "${table}" (${
          Object.keys(columns).map((key, index) => `\n  ${key} ${columns[key]}`) // (index !== Object.keys(columns).length -1 ? ',' : '')}`)
        }\n);`;

        try {
          await client.connect();
          const result = <T>((await client.query(query)).rows as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Table - Create - Table ${table} successfully created.`,
              `SERVER - DBService - Table - Create - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Table - Create - Error attempting to create table ${table}.`,
              `SERVER - DBService - Table - Create - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }

      },

      read: async <T=void>(table?: string): ServicePromise<T> => {

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = table ?
          `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table}';` 
        : 
          `SELECT table_name FROM information_schema.tables WHERE table_type = 'BASE TABLE AND table_schema = 'public';`;
        
        try {
          await client.connect();
          const result = <T>((await client.query(query)).rows as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Table - Read - ` + (table ? `${table} read successfully.` : `Tables read successfully`),
              `SERVER - DBService - Table - Read - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Table - Read - ` + (table ? `Error attempting to read table ${table}.` : `Error attempting to read tables.`),
              `SERVER - DBService - Table - Read - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      update: async <T=void>(
        table: string,
        updates: {
          add?: { [column: string]: string },
          drop?: string[],
          redefine?: { [column: string]: string },
          rename?: { [column: string]: string }
        }
      ): ServicePromise<T> => {

        if (!(Object.keys(updates).length)) {
          return {
            success: true,
            messages: [`SERVER - DBService - Table - Update - Warning attempting to update table ${table}. No updates were provided.`]
          }
        }

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `ALTER TABLE "${table}"${
          Object.keys(updates.add || {}).map((column, i) => `\n  ADD "${column}" ${updates.add![column]}`)
        } ${
          updates.drop?.map((column, i) => `\n  ADD DROP COLUMN "${column}"`) || ""
        } ${
          Object.keys(updates.redefine || {}).map((column, i) => `\n  ALTER COLUMN "${column}" TYPE ${updates.redefine![column]}`)
        } ${
          Object.keys(updates.rename || {}).map((column, i) => `\n  RENAME COLUMN "${column}" TO ${updates.redefine![column]}`)
        };`;

        try {
          await client.connect();
          const result = <T>((await client.query(query)).rows as unknown);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Table - Update - Table ${table} successfully updated.`,
              `SERVER - DBService - Table - Update - Query: ${query}`
            ],
            body: result
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Table - Update - Error attempting to update table ${table}.`,
              `SERVER - DBService - Table - Update - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      },

      delete: async (table: string): ServicePromise => {

        const client = new pg.Client({ connectionString: config.DATABASE_URL, ssl: { rejectUnauthorized: false } });
        const query = `DROP TABLE "${table}";`;

        try {
          await client.connect();
          const result = await client.query(query);
          await client.end();
          return {
            success: true,
            messages: [
              `SERVER - DBService - Table - Delete - Table ${table} successfully deleted.`,
              `SERVER - DBService - Table - Delete - Query: ${query}`
            ],
          }
        } catch (error) {
          await client.end();
          return {
            success: false,
            messages: [
              `SERVER - DBService - Table - Delete - Error attempting to delete table ${table}.`,
              `SERVER - DBService - Table - Delete - Query: ${query}`
            ].concat(<string[]>(<any>error).stack)
          }
        }
      }

    }
  }
  return service;
})();

export default db;