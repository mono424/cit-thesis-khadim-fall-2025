import {
  stalker,
  tableStorage,
  csvStorage,
  Storage,
} from "@mono424/stalker-ts";
export * from "@mono424/stalker-ts";

let appName = "app";

export const setAppName = (name: string) => {
  appName = name;
};

export const getAppName = () => {
  return appName;
};

let singletonInstace: ReturnType<typeof stalker> | null = null;

const customStorage = (callback: (csv: string) => void): Storage => {
  const csv = csvStorage({
    callback,
  });
  const table = tableStorage();
  return {
    saveSessions: async (sessions) => {
      csv.saveSessions([...sessions]);
      table.saveSessions([...sessions]);
    },
  };
};

export const createStalker = (
  csvCallback: (csv: string) => void
): ReturnType<typeof stalker> => {
  if (!singletonInstace) {
    singletonInstace = stalker(customStorage(csvCallback));
  }
  return singletonInstace;
};

export const generateSessionName = (name: string) => {
  return `${appName}_${name}_${Date.now()}`;
};
