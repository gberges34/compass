// Custom babel plugin to transform import.meta.env to process.env equivalents for Jest
module.exports = function ({ types: t }) {
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

          switch (envVar) {
            case 'DEV':
              // (process.env.NODE_ENV !== "production")
              path.replaceWith(
                t.binaryExpression(
                  '!==',
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NODE_ENV')
                  ),
                  t.stringLiteral('production')
                )
              );
              break;
            case 'PROD':
              // (process.env.NODE_ENV === "production")
              path.replaceWith(
                t.binaryExpression(
                  '===',
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NODE_ENV')
                  ),
                  t.stringLiteral('production')
                )
              );
              break;
            case 'MODE':
              // (process.env.NODE_ENV || "test")
              path.replaceWith(
                t.logicalExpression(
                  '||',
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier('NODE_ENV')
                  ),
                  t.stringLiteral('test')
                )
              );
              break;
            case 'BASE_URL':
              // "/" (default base URL in Vite)
              path.replaceWith(t.stringLiteral('/'));
              break;
            case 'SSR':
              // false (not server-side rendering in Jest browser tests)
              path.replaceWith(t.booleanLiteral(false));
              break;
            default:
              // Only transform VITE_ prefixed variables to avoid accidentally
              // transforming other import.meta.env properties
              if (envVar.startsWith('VITE_')) {
                // process.env.VITE_VAR
                path.replaceWith(
                  t.memberExpression(
                    t.memberExpression(t.identifier('process'), t.identifier('env')),
                    t.identifier(envVar)
                  )
                );
              }
              break;
          }
        }
      },
    },
  };
};
