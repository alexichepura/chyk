import { Chyk, TChykCtx } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const ctx = (window as any).chyk_ctx as TChykCtx

const init = async () => {
  const chyk = new Chyk({
    routes,
    ctx,
    browser: true,
    defaultProps: { apiClient },
  })
  chyk.tryHydrate(document.getElementById("app"))
}

init()
