export const ENV = process.env.NODE_ENV as "development" | "producetion";

export const isDev = ENV === "development";
