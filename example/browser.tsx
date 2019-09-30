import { Chyk } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const init = async () => {
  const chyk = new Chyk({
    url: new URL(window.location.href),
    routes,
    data: (window as any).ssr_data,
    browser: true,
  })
  await chyk.tryLoadData({ apiClient })
  chyk.tryHydrate(document.getElementById("app"))
}

init()
