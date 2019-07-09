type TJsEntrypoints = string[]
type TJsEntrypointsRecord = { js: TJsEntrypoints }

export const MANIFEST_PATH = "manifest.json"

export type TWebpackAssetsManifestJson<T extends string = ""> = Record<string, string> & {
  entrypoints: Record<T, TJsEntrypointsRecord>
}

export const getEntryAssetsScripts = (base: string, jsEntrypoints: TJsEntrypoints) => {
  return jsEntrypoints.map(entryChunk => `<script src="${base}/${entryChunk}"></script>`).join("\n")
}

export async function getWebpackAssetsManifest<T extends string = "">(
  base: string
): Promise<TWebpackAssetsManifestJson<T>> {
  const webpackAssetsManifest: TWebpackAssetsManifestJson<T> = await fetch(
    `${base}/${MANIFEST_PATH}`
  ).then(r => r.json())
  return webpackAssetsManifest
}
