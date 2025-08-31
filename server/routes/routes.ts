import { ParsedRequest } from "../services/requestParser/requestParser.service";
import { RouterResponse } from "../services/router/router.service";
import { Schema } from '../services/validation/validation.service';

import config from '../config/config';

export interface Route {
  method: string[],
  contentType: string,
  privilege: string[],
  schema: Schema,
  route: (request: ParsedRequest) => Promise<RouterResponse>
  subRoutes?: { [key: string]: Route }
}

const routes: { [key: string]: Route } = {
//  update: {
//     method: ['POST'],
//     contentType: "application/json",
//     privilege: ['user'],
//     schema: updateSchema,
//     route: updateRoute 
//   }
}

export default routes;