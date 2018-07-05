"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This was changed in graphql@0.12
// See https://github.com/apollographql/graphql-tools/pull/541
// TODO fix types https://github.com/apollographql/graphql-tools/issues/542
var oldTypeExtensionDefinitionKind = 'TypeExtensionDefinition';
var newExtensionDefinitionKind = 'ObjectTypeExtension';
var interfaceExtensionDefinitionKind = 'InterfaceTypeExtension';
function extractExtensionDefinitions(ast) {
    var extensionDefs = ast.definitions.filter(function (def) {
        return def.kind === oldTypeExtensionDefinitionKind ||
            def.kind === newExtensionDefinitionKind ||
            def.kind === interfaceExtensionDefinitionKind;
    });
    return Object.assign({}, ast, {
        definitions: extensionDefs,
    });
}
exports.default = extractExtensionDefinitions;
//# sourceMappingURL=extractExtensionDefinitions.js.map