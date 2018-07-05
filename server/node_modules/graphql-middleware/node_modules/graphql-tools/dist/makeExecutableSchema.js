"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var graphql_1 = require("graphql");
var schemaVisitor_1 = require("./schemaVisitor");
var mergeDeep_1 = require("./mergeDeep");
var generate_1 = require("./generate");
// type definitions can be a string or an array of strings.
function _generateSchema(typeDefinitions, resolveFunctions, logger, 
    // TODO: rename to allowUndefinedInResolve to be consistent
    allowUndefinedInResolve, resolverValidationOptions, parseOptions, inheritResolversFromInterfaces) {
    if (typeof resolverValidationOptions !== 'object') {
        throw new generate_1.SchemaError('Expected `resolverValidationOptions` to be an object');
    }
    if (!typeDefinitions) {
        throw new generate_1.SchemaError('Must provide typeDefs');
    }
    if (!resolveFunctions) {
        throw new generate_1.SchemaError('Must provide resolvers');
    }
    var resolvers = Array.isArray(resolveFunctions)
        ? resolveFunctions
            .filter(function (resolverObj) { return typeof resolverObj === 'object'; })
            .reduce(mergeDeep_1.default, {})
        : resolveFunctions;
    // TODO: check that typeDefinitions is either string or array of strings
    var schema = generate_1.buildSchemaFromTypeDefinitions(typeDefinitions, parseOptions);
    generate_1.addResolveFunctionsToSchema({
        schema: schema,
        resolvers: resolvers,
        resolverValidationOptions: resolverValidationOptions,
        inheritResolversFromInterfaces: inheritResolversFromInterfaces,
    });
    generate_1.assertResolveFunctionsPresent(schema, resolverValidationOptions);
    if (!allowUndefinedInResolve) {
        addCatchUndefinedToSchema(schema);
    }
    if (logger) {
        addErrorLoggingToSchema(schema, logger);
    }
    return schema;
}
function makeExecutableSchema(_a) {
    var typeDefs = _a.typeDefs, _b = _a.resolvers, resolvers = _b === void 0 ? {} : _b, connectors = _a.connectors, logger = _a.logger, _c = _a.allowUndefinedInResolve, allowUndefinedInResolve = _c === void 0 ? true : _c, _d = _a.resolverValidationOptions, resolverValidationOptions = _d === void 0 ? {} : _d, _e = _a.directiveResolvers, directiveResolvers = _e === void 0 ? null : _e, _f = _a.schemaDirectives, schemaDirectives = _f === void 0 ? null : _f, _g = _a.parseOptions, parseOptions = _g === void 0 ? {} : _g, _h = _a.inheritResolversFromInterfaces, inheritResolversFromInterfaces = _h === void 0 ? false : _h;
    var jsSchema = _generateSchema(typeDefs, resolvers, logger, allowUndefinedInResolve, resolverValidationOptions, parseOptions, inheritResolversFromInterfaces);
    if (typeof resolvers['__schema'] === 'function') {
        // TODO a bit of a hack now, better rewrite generateSchema to attach it there.
        // not doing that now, because I'd have to rewrite a lot of tests.
        generate_1.addSchemaLevelResolveFunction(jsSchema, resolvers['__schema']);
    }
    if (connectors) {
        // connectors are optional, at least for now. That means you can just import them in the resolve
        // function if you want.
        generate_1.attachConnectorsToContext(jsSchema, connectors);
    }
    if (directiveResolvers) {
        generate_1.attachDirectiveResolvers(jsSchema, directiveResolvers);
    }
    if (schemaDirectives) {
        schemaVisitor_1.SchemaDirectiveVisitor.visitSchemaDirectives(jsSchema, schemaDirectives);
    }
    return jsSchema;
}
exports.makeExecutableSchema = makeExecutableSchema;
function decorateToCatchUndefined(fn, hint) {
    if (typeof fn === 'undefined') {
        fn = graphql_1.defaultFieldResolver;
    }
    return function (root, args, ctx, info) {
        var result = fn(root, args, ctx, info);
        if (typeof result === 'undefined') {
            throw new Error("Resolve function for \"" + hint + "\" returned undefined");
        }
        return result;
    };
}
function addCatchUndefinedToSchema(schema) {
    generate_1.forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = decorateToCatchUndefined(field.resolve, errorHint);
    });
}
exports.addCatchUndefinedToSchema = addCatchUndefinedToSchema;
function addErrorLoggingToSchema(schema, logger) {
    if (!logger) {
        throw new Error('Must provide a logger');
    }
    if (typeof logger.log !== 'function') {
        throw new Error('Logger.log must be a function');
    }
    generate_1.forEachField(schema, function (field, typeName, fieldName) {
        var errorHint = typeName + "." + fieldName;
        field.resolve = generate_1.decorateWithLogger(field.resolve, logger, errorHint);
    });
}
exports.addErrorLoggingToSchema = addErrorLoggingToSchema;
__export(require("./generate"));
//# sourceMappingURL=makeExecutableSchema.js.map