export type NestedIntersect<T, P> = {
  [K in keyof T]: T[K] & P;
};
