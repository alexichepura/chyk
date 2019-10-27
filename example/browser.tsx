import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

new Chyk<TDeps>({
  routes,
  data: (window as any).ssr_data,
  statusCode: (window as any).ssr_statusCode,
  el: document.getElementById("app"),
  deps: { apiSdk: new DbClient() },
})
