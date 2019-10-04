require("dotenv").config()
const { WDS_PORT, PORT } = process.env
import { createServer } from "http"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { Chyk, TChykCtx } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const port = (PORT && Number(PORT)) || 3000
const server = createServer()
server.on("request", async (request, response) => {
  try {
    const pathname: string = request.url || ""
    const chyk = new Chyk({ routes, defaultProps: { apiClient } })
    await chyk.loadData(pathname)
    const html = renderToString(createElement(chyk.renderStatic, { pathname }))

    response.statusCode = chyk.statusCode
    response.end(template({ html, chyk_ctx: chyk.ctx }))
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
  chyk_ctx: TChykCtx
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
  <script>window.chyk_ctx = ${JSON.stringify(props.chyk_ctx)}</script>
  <script src="${
    WDS_PORT ? `http://localhost:${WDS_PORT}/dist/browser.js` : "/browser.js"
  }"></script>
</body>
</html>
`
