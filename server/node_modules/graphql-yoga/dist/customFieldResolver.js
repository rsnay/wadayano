"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var customFieldResolver = function (source, args, context, info) {
    // ensure source is a value for which property access is acceptable.
    if (typeof source === 'object' || typeof source === 'function') {
        var property = source[info.fieldNodes[0].alias
            ? info.fieldNodes[0].alias.value
            : info.fieldName];
        if (typeof property === 'function') {
            return source[info.fieldName](args, context, info);
        }
        return property;
    }
};
exports.customFieldResolver = customFieldResolver;
exports.default = customFieldResolver;
//# sourceMappingURL=customFieldResolver.js.map