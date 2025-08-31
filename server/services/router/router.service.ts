import routes from '../../routes/routes';
import { Schema } from '../validation/validation.service';
import authentication from '../authentication/authentication.service';
import validation from '../validation/validation.service';
import config from '../../config/config';
import { ParsedRequest } from '../requestParser/requestParser.service';
import { Service, ServicePromise } from '../services';

export interface RouterResponse<T = any> {
  code: number,
  headers?: { [key: string]: string },
  redirect?: string,
  filename?: string,
  html?: string,
  json?: T
}

export interface Route {
  method: string[],
  contentType: string,
  privilege: string[],
  schema: Schema,
  route: (request: ParsedRequest) => Promise<RouterResponse>
  subRoutes?: { [key: string]: Route }
}

// pick preferred compatible response type
const negotiateCompatibleResponseContentType = (requestAccepts: string, routeContentType: string): string => {

  // break down accepts string into [[type, subtype]]
  const reqTypes: string[][] = requestAccepts.split(',').map(type => type.indexOf(';') > -1 ? type.substring(0, type.lastIndexOf(';')).toLowerCase().split('/') : type.toLowerCase().split('/') );
  const resTypes: string[][] = routeContentType.split(',').map(type => type.indexOf(';') > -1 ? type.substring(0, type.lastIndexOf(';')).toLowerCase().split('/') : type.toLowerCase().split('/') );

  if (reqTypes.some(type => type[0] === '*')) { return resTypes[0].join('/'); }
  if (resTypes.some(type => type[0] === '*')) { return reqTypes[0].join('/'); } // should pretty much never happen

  let matches = resTypes.filter(resType => {
    if (reqTypes.some(reqType => 
      resType[0] === reqType[0] &&
      (
        resType[1] === reqType[1] ||
        resType[1] === '*' || // should pretty much never happen
        reqType[1] === '*'
      )
    )) {
      return true;
    }
  });

  matches = matches.map(resType => resType[1] !== '*' ? resType : reqTypes.find(reqType => resType[0] === reqType[0])!) // but if resType[1] === '*', replace with specified reqType[1] 

  return matches[0]?.join('/') || '';
}

const acceptsJSON = (accepts: string): boolean => accepts.includes('application/json') || accepts.includes('*/*');
const acceptsHTML = (accepts: string): boolean => accepts.includes('text/html') || accepts.includes('*/*');

const error = (request: ParsedRequest, response: RouterResponse): RouterResponse => {
  if (acceptsJSON(request.accepts)) {
    return response;
  } else {
    return {
      code: 302,
      redirect: config.ERROR_URL + (new URLSearchParams(JSON.stringify(response)))
    };
  }
}

const router = ((): typeof service extends Service ? typeof service : never => {
  const service = async (request: ParsedRequest): ServicePromise<RouterResponse> => {

    if (!request.route.length) {
      return new Promise(resolve => resolve({
        success: false,
        messages: ['SERVER - SERVICES - ROUTER - Route was not provided.'],
        body: error(request, { 
          code: 400,
          json: {
            success: false,
            messages: ['Route was not provided.'],
          } 
        })
      }));     
    }
    
    let routePath = request.route.split('/').filter(part => part.length);

    let route: Route | undefined = routes[routePath.shift() || 'not found'];
    while (routePath.length && route) {
      route = route.subRoutes?.[routePath.shift() || 'not found'];
    }
    // let route: Route | undefined = routes[request.route];
    
    if (!route) {
      return new Promise(resolve => resolve({
        success: false,
        messages: [`SERVER - SERVICES - ROUTER - Provided route, '${request.route}' does not exist.`],
        body: error(request, { 
          code: 404,
          json: {
            success: false,
            messages: [`Provided route, '${request.route}' does not exist.`],
          }
        })
      }));
    }
    
    if (!(route.method.indexOf(request.method) > -1)) {
      return new Promise(resolve => resolve({
        success: false,
        messages: [
          'SERVER - SERVICES - ROUTER - Method not allowed.', 
          `SERVER - SERVICES - ROUTER - Provided route, '${request.route}' is ${route!.method} method.`
        ],
        body: error(request, { 
          code: 405,
          json: {
            success: false,
            messages: [
              'Method not allowed.', 
              `Provided route, '${request.route}' is ${route!.method} method.`
            ]
          }
        })
      }));
    }

    // for priveleged routes
    if (!(route.privilege.indexOf('guest') > -1)) {

      if (!(request.token)) {
        return new Promise(resolve => resolve({
          success: false,
          messages: ['SERVER - SERVICES - ROUTER - Authentication was not provided for protected route.'],
          body: error(request, { 
            code: 401,
            json: {
              success: false,
              messages: ['Authentication was not provided for protected route.']
            } 
          })
        }));
      }

      let tokenRes = await authentication.verifyToken(request.token); // should check for success
      if (!(tokenRes.success)) {
        return new Promise(resolve => resolve({
          success: false,
          messages: ['SERVER - SERVICES - ROUTER - Provided authentication was not valid.', ...tokenRes.messages],
          body: error(request, { 
            code: 403,
            json: {
              success: false,
              messages: ['Provided authentication was not valid.', ...tokenRes.messages]
            } 
          })
        }));
      }

      let token = tokenRes.body!;
      if (!(token.hasOwnProperty('privilege') && route.privilege.indexOf(token.privilege) > -1)) {
        return new Promise(resolve => resolve({
          success: false,
          messages: ['SERVER - SERVICES - ROUTER - Provided authentication does not have privilege to access route.'],
          body: error(request, { 
            code: 403,
            json: {
              success: false,
              messages: ['Provided authentication does not have privilege to access route.']    
            }
          })
        }));        
      }

    }

    let validationRes = await validation(request.params, route.schema);

    if (!validationRes.success) {
      return new Promise(resolve => resolve({
        success: false,
        messages: [
          'SERVER - SERVICES - ROUTER - Validation failed for route parameters.',
          ...validationRes.body!
        ],
        body: error(request, { 
          code: 400,
          json: {
            success: false,
            messages: [
              'Validation failed for route parameters.',
              ...validationRes.body!
            ]
          }
        })
      }));
    }

    const negotiated: string = negotiateCompatibleResponseContentType(request.accepts, route.contentType);

    if (!negotiated) {
      return new Promise(resolve => resolve({
        success: false,
        messages: [
          `SERVER - SERVICES - ROUTER - Could not negotiate response type.`,
          `SERVER - SERVICES - ROUTER - Request accepts ${request.accepts}.`,
          `SERVER - SERVICES - ROUTER - Route provides ${route!.contentType}`
        ],
        body: error(request, { 
          code: 400,
          json: {
            success: false,
            messages: [
              `Could not negotiate response type.`,
              `Request accepts ${request.accepts}.`,
              `Route provides ${route!.contentType}`
            ]           
          }
        })
      }));
    }

    // route access granted for request!
    request.accepts = negotiated;
    const body = await route!.route(request);

    return new Promise(resolve => resolve({
      success: true,
      messages: [
        `SERVER - SERVICES - ROUTER - Request successfully routed.`,
        ...(body.json?.messages || [])
      ],
      body: body
    }));
  }
  return service;
})();

export default router;