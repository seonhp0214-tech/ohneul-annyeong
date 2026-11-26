// 예전 import 경로(@/lib/store)를 계속 쓸 수 있게 해 주는 얇은 연결 파일이에요.
export { useApp } from "./data";
export * from "./data/types";
export { DEMO_CODES, NEIGHBORS } from "./data/mock";
export { formatLast, formatAgo } from "./data/format";
export type { AppActions as Actions } from "./data/types";
