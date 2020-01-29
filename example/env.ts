const { PORT, WDS_PORT, DISABLE_SSR } = process.env

export const env = {
  PORT: (PORT && Number(PORT)) || 3000,
  WDS_PORT: (WDS_PORT && Number(WDS_PORT)) || 3001,
  DISABLE_SSR,
}
