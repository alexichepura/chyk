require("dotenv").config()
const { WDS_PORT, PORT } = process.env
import { createServer } from "http"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

const port = (PORT && Number(PORT)) || 3000
const server = createServer(async (request, response) => {
  try {
    const pathname: string = request.url || ""
    const chyk = new Chyk<TDeps>({ routes, deps: { apiSdk: new DbClient() } })
    await chyk.loadData(pathname)
    const html = renderToString(createElement(chyk.renderStatic))
    const { data, statusCode } = chyk.currentLocationState
    response.statusCode = statusCode
    response.end(template({ html, data, statusCode }))
  } catch (e) {
    console.log(e)
    response.end(e)
  }
})

server.listen(port, () => {
  console.log(`server is listening on ${port}`)
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
