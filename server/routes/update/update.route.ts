import * as exec from 'child_process';
import * as path from 'path';

import { ParsedRequest } from '../../services/requestParser/requestParser.service';
import { RouterResponse } from '../../services/router/router.service';

import config from '../../config/config';

import crypto from 'crypto';

import db from '../../services/db/db.service';

export default async (request: ParsedRequest<{ username: string, code: string }>): Promise<RouterResponse> => { 


  return new Promise(res => res({
    code: 500,
    json: {
      success: true, 
      messages: [`SERVER - ROUTES - UPDATE - Server UPDATE may or may not have been dispatched.`]
    }
  }));

}