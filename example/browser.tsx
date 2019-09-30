import { Chyk } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const init = async () => {
  const chyk = new Chyk({
    url: new URL(window.location.href),
    routes,
    data: (window as any).ssr_data,
    browser: true,
    defaultProps: { apiClient },
  })
  await chyk.tryLoadData()
  chyk.tryHydrate(document.getElementById("app"))
}

init()
