import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

new Chyk<TDeps>({
  routes,
  deps: { apiSdk: new DbClient() },
  data: (window as any).ssr_data,
  statusCode: (window as any).ssr_statusCode,
  el: document.getElementById("app"),
})
