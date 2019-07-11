type TJsEntrypoints = string[]
type TJsEntrypointsRecord = { js: TJsEntrypoints }

export type TWebpackAssetsManifestJson<T extends string = ""> = Record<string, string> & {
  entrypoints: Record<T, TJsEntrypointsRecord>
}

export const getEntryAssetsScripts = (base: string, jsEntrypoints: TJsEntrypoints) => {
  return jsEntrypoints.map(entryChunk => `<script src="${base}/${entryChunk}"></script>`).join("\n")
}
