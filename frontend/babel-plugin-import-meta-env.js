// Custom babel plugin to transform import.meta.env to process.env equivalents for Jest
module.exports = function () {
  return {
    visitor: {
      MemberExpression(path) {
        // Check for import.meta.env.X pattern
        if (
          path.node.object?.type === 'MemberExpression' &&
          path.node.object.object?.type === 'MetaProperty' &&
          path.node.object.object.meta?.name === 'import' &&
          path.node.object.object.property?.name === 'meta' &&
          path.node.object.property?.name === 'env'
        ) {
          const envVar = path.node.property.name;
          
          if (envVar === 'DEV') {
            path.replaceWithSourceString('(process.env.NODE_ENV !== "production")');
          } else if (envVar === 'PROD') {
            path.replaceWithSourceString('(process.env.NODE_ENV === "production")');
          } else if (envVar === 'MODE') {
            path.replaceWithSourceString('(process.env.NODE_ENV || "test")');
          } else {
            // For VITE_* variables, map to process.env
            path.replaceWithSourceString(`process.env.${envVar}`);
          }
        }
      },
    },
  };
};

