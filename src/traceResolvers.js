const { applyMiddlewareToDeclaredResolvers } = require('graphql-middleware');
const AWSXRay = require('aws-xray-sdk-core');
const isPromise = require('is-promise');

function fieldPathFromInfo (info) {
  let path = info.path;
  const segments = [];
  while (path) {
    segments.unshift(path.key);
    path = path.prev;
  }

  return segments.join('.');
}

const tracer = function (resolver, parent, args, ctx, info) {
  const result = resolver();

  if (isPromise(result)) {
    const fieldPath = fieldPathFromInfo(info);
    AWSXRay.captureAsyncFunc(`GraphQL ${fieldPath}`, function (subsegment) {
      // When AWS_XRAY_CONTEXT_MISSING is set to LOG_MISSING and no context was
      // found, then the subsegment will be null and nothing should be done
      if (subsegment) {
        result.then(function () {
          subsegment.close();
        }).catch(function (error) {
          subsegment.close(error);
        });
      }
    });
  }

  return result;
};

module.exports = function (schema) {
  applyMiddlewareToDeclaredResolvers(schema, tracer);
};
