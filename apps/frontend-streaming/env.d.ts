interface ImportMetaEnv {
  readonly VITE_ZENOH_URL: string;
  readonly VITE_ARTEKMED_TOPIC_PREFIX: string;
  readonly VITE_INFLUXDB_TOKEN: string;
  readonly VITE_INFLUXDB_URL: string;
  readonly VITE_BACKEND_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
