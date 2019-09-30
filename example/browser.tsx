import React from "react"
import { hydrate, render } from "react-dom"
import { Chyk } from "../src/chyk"
import { routes } from "./app"

const init = async () => {
  const appNode = document.getElementById("app")
  const renderMethod = appNode && appNode.childNodes.length === 0 ? render : hydrate
  const url = new URL(window.location.href)
  const chyk = new Chyk({ url, routes })

  await chyk.loadData()

  const Component = chyk.render
  renderMethod(<Component />, appNode)
}

init()
