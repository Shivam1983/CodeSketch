export const HTTP_Backend =
  process.env.NEXT_PUBLIC_HTTP_BACKEND || "http://localhost:3002";
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080";
export const CODE_EXECUTION_URL = `${HTTP_Backend}/execute-code`;

