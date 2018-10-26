export function isAsync(fn) {
 return fn.constructor.name === 'AsyncFunction';
}
