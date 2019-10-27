import { createElement } from "react"
import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

const init = async () => {
  const chyk = new Chyk<TDeps>({
    routes,
    el: document.getElementById("app"),
    deps: { apiSdk: new DbClient() },
    data: (window as any).ssr_data,
    statusCode: (window as any).ssr_statusCode,
  })
  chyk.renderer(createElement(chyk.render), chyk.el)
}

init()
