/// <reference types="react-dom/experimental" />
/// <reference types="react/experimental" />
import React from "react"
import { unstable_createRoot } from "react-dom"
import { ChykComponent } from "../src"
import { Chyk } from "../src/chyk"
import { routes, TDeps } from "./app"
import { DbClient } from "./db"

declare global {
  interface Window {
    ssr_data: any
    ssr_statusCode: number
  }
}

const chyk = new Chyk<TDeps>({
  routes,
  deps: { apiSdk: new DbClient() },
  data: window.ssr_data,
  statusCode: window.ssr_statusCode,
  onLoadError: (err) => {
    console.log("onLoadError", err)
  },
})

const node = document.getElementById("app")
unstable_createRoot(node!).render(
  <React.StrictMode>
    <ChykComponent chyk={chyk} />
  </React.StrictMode>
)
