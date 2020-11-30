require("dotenv").config()
import { createServer } from "http"
import React from "react"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import { ChykContext, DataRoutes } from "../src"
import { Chyk } from "../src/chyk"
import { createBranchItemMapper, getBranch, routes, TAppBranchItem } from "./app"
import { DbClient } from "./db"
import { env } from "./env"

const { DISABLE_SSR, PORT, WDS_PORT } = env

const server = createServer(async (request, response) => {
  try {
    const pathname: string = request.url || ""
    if (DISABLE_SSR === "true") {
      response.statusCode = 200
      response.end(template({ html: "", data: null, statusCode: 200 }))
    } else {
      const deps = { apiSdk: new DbClient() }
      const chyk: Chyk = new Chyk({
        getBranch: getBranch,
        branchItemsMapper: (branchItem, abortController) => {
          return createBranchItemMapper(chyk, deps)(branchItem as TAppBranchItem, abortController)
        },
      })
      await chyk.loadData(getBranch(routes, pathname), pathname)
      const html = renderToString(
        <ChykContext.Provider value={chyk}>
          <StaticRouter location={chyk.state.location}>
            <DataRoutes routes={routes} chyk={chyk} />
          </StaticRouter>
        </ChykContext.Provider>
      )
      const { statusCode } = chyk.state
      const { data } = chyk
      response.statusCode = statusCode
      response.end(template({ html, data, statusCode }))
    }
  } catch (e) {
    console.log(e)
    response.end(e)
  }
})

server.listen(PORT, () => {
  console.log("🚀 Server started", "http://localhost:" + PORT)
})

type TTemplateProps = {
  html: string
  data: any
  statusCode: number
}
const template = (props: TTemplateProps) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>App</title>
</head>
<body>
  <div id="app">${props.html}</div>
  <script>window.ssr_data = ${JSON.stringify(props.data)}</script>
  <script>window.ssr_statusCode = ${props.statusCode}</script>
  <script src="${
    WDS_PORT ? `http://localhost:${WDS_PORT}/dist/browser.js` : "/browser.js"
  }"></script>
</body>
</html>
`
