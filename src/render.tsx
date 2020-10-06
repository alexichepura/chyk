import React, { FC, useEffect, useState } from "react"
import { hydrate, render } from "react-dom"
import { Route, Router, StaticRouter } from "react-router"
import { useChyk } from "."
import { Chyk } from "./chyk"
import { ChykContext } from "./hooks"
import { DataRoutes } from "./routes"

export const chykHydrateOrRender = (chyk: Chyk) => {
  if (!chyk.el) {
    throw "No renderer for no element"
  }
  const renderer = chyk.el.childNodes.length === 0 ? render : hydrate
  renderer(<ChykComponent chyk={chyk} />, chyk.el)
}

export const ChykComponent: FC<{ chyk: Chyk }> = ({ chyk }) => {
  if (!chyk.history) {
    throw "No history"
  }
  const WrapperComponent = chyk.component || React.Fragment
  return (
    <ChykContext.Provider value={chyk}>
      <Router history={chyk.history}>
        <Preloader>
          <WrapperComponent>
            <DataRoutes routes={chyk.routes} />
          </WrapperComponent>
        </Preloader>
      </Router>
    </ChykContext.Provider>
  )
}
ChykComponent.displayName = "ChykComponent"

export const ChykStaticComponent: FC<{ chyk: Chyk }> = ({ chyk }) => {
  const WrapperComponent = chyk.component || React.Fragment
  return (
    <ChykContext.Provider value={chyk}>
      <StaticRouter location={chyk.state.location} context={chyk.staticRouterContext}>
        <WrapperComponent>
          <DataRoutes routes={chyk.routes} />
        </WrapperComponent>
      </StaticRouter>
    </ChykContext.Provider>
  )
}
ChykStaticComponent.displayName = "ChykStaticComponent"

const usePreloader = () => {
  const chyk = useChyk()
  const [, set_render_location] = useState(chyk.state.location) // just to rerender

  useEffect(() => {
    chyk.history?.listen(async (new_location) => {
      chyk.abortLoading()
      await chyk.loadData(new_location)
      console.log("locationStates", chyk.states)
      set_render_location(new_location)
    })
  }, [])

  return chyk.state.location
}

export const Preloader: FC = ({ children }) => {
  const render_location = usePreloader()
  return <Route location={render_location} render={() => children} />
}
Preloader.displayName = "Preloader"
