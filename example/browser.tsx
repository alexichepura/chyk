import { Chyk } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const init = async () => {
  const chyk = new Chyk({
    routes,
    ctx: (window as any).chyk_ctx,
    browser: true,
    defaultProps: { apiClient },
  })
  await chyk.loadLocationData()
  chyk.tryHydrate(document.getElementById("app"))
}

init()
