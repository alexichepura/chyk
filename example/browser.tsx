import React from "react"
import { hydrate, render } from "react-dom"
import { Chyk } from "../src/chyk"
import { routes } from "./app"
import { apiClient } from "./db"

const init = async () => {
  const appNode = document.getElementById("app")
  const chyk = new Chyk({
    url: new URL(window.location.href),
    routes,
    data: (window as any).ssr_data,
  })
  await chyk.loadData({ apiClient })
  const Component = chyk.render

  const renderMethod = appNode && appNode.childNodes.length === 0 ? render : hydrate
  renderMethod(<Component />, appNode)
}

init()
