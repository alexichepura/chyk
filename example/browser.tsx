import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

declare global {
  interface Window {
    ssr_data: any
    ssr_statusCode: number
  }
}

new Chyk<TDeps>({
  routes,
  deps: { apiSdk: new DbClient() },
  data: window.ssr_data,
  statusCode: window.ssr_statusCode,
  el: document.getElementById("app"),
})
