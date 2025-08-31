import { Service, ServicePromise } from '../services';

type Primitive = string | number | boolean;

export type Schema = {
  [key: string]: {
    type:  
      "string" | "number" | "boolean" |
      "string | number" | "string | boolean" | "number | boolean" | 
      "string | number | boolean" |
      RegExp | Primitive[] | Schema,
    attributes?: {
      required?: boolean,
      array?: { minLength?: number, maxLength?: number },
      range?: { min?: number | string, max?: number | string },
      strLength?: { minLength?: number, maxLength?: number },
      tests?: ((inputRoot: any, input: any) => { success: boolean, message?: string })[] 
    }
  }
}

export const COMMON_REGEXES = {
  EMAIL: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
  ALPHA: /^[a-zA-Z]*$/,
  NUMERIC: /^[0-9]*$/,
  ALPHA_NUMERIC: /^[a-zA-Z0-9]*$/,
  ALPHA_NUMERIC_SPACES: /^[a-zA-Z0-9 ]*$/,
  COMMON_WRITING: /^[A-Za-z0-9\s\r\n.,!?'"()\-]*$/, //  /^[A-Za-z0-9 \-_.,?!()"'/$&]*$/,
  PASSWORD_STRONGEST: /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[-+_!@#$%^&*.,?])/
};

const validation = ((): typeof service extends Service ? typeof service : never => {

  const service = (input: any, schema: Schema): ServicePromise<string[]> => {
    
    const validateLeafNode = (input: any, schema: Schema, key: string, root: any): string[] => {
      
      let errors: string[] = [];

      // reject leaf node inputs that do not match specified type
      if (
        (typeof schema[key].type === 'string' && !((<string>schema[key].type).includes(typeof input))) ||
        (schema[key].type instanceof RegExp && !(typeof input === 'string')) ||
        (Array.isArray(schema[key].type) && !((<Primitive[]>schema[key].type).includes(input))) 
      ) {
        return [key + ' does not match specified type.'];  // no further testing can safely be made
      }

      // inputs that match schema type are assumed to have only schema attributes 
      // that make sense for that specified type

      // regex test
      if ((schema[key].type instanceof RegExp) && !((<RegExp>schema[key].type).test(input))) {
        errors.push(key + ` does not match specified format.`);
      }

      // string length tests
      if (schema[key].attributes?.strLength?.hasOwnProperty('minLength')) {
        if (input.length < schema[key].attributes!.strLength!.minLength!) {
          errors.push(key + ` does not meet minimum specified length.`);
        }
      }

      if (schema[key].attributes?.strLength?.hasOwnProperty('maxLength')) {
        if (input.length > schema[key].attributes!.strLength!.maxLength!) {
          errors.push(key + ` exceeds minimum specified length.`);
        }
      }
      
      // number or string range tests
      if (schema[key].attributes?.range?.hasOwnProperty('min')) {
        if (input < schema[key].attributes!.range!.min!) {
          errors.push(key + ` is below specified range minimum.`);
        }
      }
      
      if (schema[key].attributes?.range?.hasOwnProperty('max')) {
        if (input > schema[key].attributes!.range!.max!) {
          errors.push(key + ` is above specified range maximum.`);
        }
      }

      // custom tests
      schema[key].attributes?.tests?.forEach((test) => {
        let res = test(root, input);
        if (!res.success) {
          errors.push(key + ` ` + (res.message || ` failed custom test.`))
        }
      });
      console.log(errors);

      return errors;
    }

    const validateNode = (input: any, schema: Schema, root: any): string[] => Object.keys(schema).reduce((errors: string[], key: string): string[] => {

      // if input does not have key
      if (!(input.hasOwnProperty(key) && !(input[key] === undefined || input[key] === null))) {
        if (schema[key].attributes?.required) {
          errors.push(key + ' is required.');         
        }
        return errors;
      }

      // reject array inputs that are not supposed to be arrays
      // reject inputs that are supposed to be arrays, but are not
      if (Array.isArray(input[key]) != !!(schema[key].attributes?.array)) {
        errors.push(key + ' does not match specified type.');
        return errors;
      }

      // reject array inputs that violate array length bounds
      if (Array.isArray(input[key])) {
        if (schema[key].attributes?.array?.hasOwnProperty('minLength') && (input[key].length < schema[key].attributes!.array!.minLength!)) {
          errors.push(key + ' does not meet the specified minimum array length.'); // subceeds
        }
        if (schema[key].attributes?.array?.hasOwnProperty('maxLength') && (input[key].length > schema[key].attributes!.array!.maxLength!)) {
          errors.push(key + ' exceeds specified maximum array length.');
        }
        return errors;
      }

      // type is nested schema
      if (typeof schema[key].type === 'object' && !(schema[key].type instanceof RegExp || Array.isArray(schema[key].type))) {
        if (Array.isArray(input[key])) {
          errors = errors.concat(input[key].reduce((errors2: string[], item: any): string[] => errors2.concat(validateNode(item, <Schema>(schema[key].type), root)), []));
        } else {
          errors = errors.concat(validateNode(input[key], <Schema>(schema[key].type), root));
        }
        return errors;
      }
      
      // type is leaf node or array of leaf nodes
      if (Array.isArray(input[key])) {
        errors = errors.concat(input[key].reduce((errors2: string[], item: any): string[] => errors2.concat(validateLeafNode(item, schema, key, root), [])));
      } else {
        errors = errors.concat(validateLeafNode(input[key], schema, key, root)); 
      }
      return errors;

    }, []);

    const errors = validateNode(input, schema, input);
    return new Promise((resolve => resolve({
      success: !(errors.length),
      messages: [
        errors.length ?
          `Server - Services - Validation - Validation failed for input.`
        :
          `Server - Services - Validation - Input successfully validated.`
      ],
      body: errors
    })));

  }
  return service;
})();

export default validation;

