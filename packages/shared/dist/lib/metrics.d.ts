import { stalker } from '@mono424/stalker-ts';
export * from '@mono424/stalker-ts';
export declare const setAppName: (name: string) => void;
export declare const getAppName: () => string;
export declare const createStalker: (csvCallback: (csv: string) => void) => ReturnType<typeof stalker>;
export declare const generateSessionName: (name: string) => string;
