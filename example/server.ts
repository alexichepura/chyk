require("dotenv").config()
const { WDS_PORT } = process.env
import { createServer, RequestListener } from "http"
import { createElement } from "react"
import { renderToString } from "react-dom/server"
import { Chyk } from "../src/chyk"
import { Layout, routes } from "./app"
import { delay } from "./db"

const requestHandler: RequestListener = (request, response) => {
  const pathname: string = request.url || ""
  const url = new URL(pathname, "http://localhost")
  const chyk = new Chyk({ url, routes: routes })
  delay().then(async () => {
    await chyk.loadData()

    const Component = chyk.render
    const html = renderToString(createElement(Component, null, Layout))

    response.statusCode = chyk.statusCode
    response.end(template({ html }))
  })
}

const port = 3000
const server = createServer(requestHandler)
server.listen(port, () => {
  console.log(`server is listening on ${port}`)
})

type TTemplateProps = {
  html: string
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
  <script src="${WDS_PORT ? `http://localhost:${WDS_PORT}/dist/app.js` : "/app.js"}"></script>
</body>
</html>
`
