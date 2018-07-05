import { GraphQLSchema } from 'graphql';
import { IMiddleware } from './types';
export { IMiddleware };
export declare class MiddlewareError extends Error {
    constructor(...props: any[]);
}
export declare function applyMiddleware(schema: GraphQLSchema, ...middleware: IMiddleware[]): GraphQLSchema;
