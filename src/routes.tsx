import React, { FC } from "react"
import { Route, Switch } from "react-router"
import { TRouteConfig } from "./branch"
import { Chyk } from "./chyk"

type TDataRoutesProps = {
  routes: TRouteConfig[]
  chyk: Chyk
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, chyk }) => {
  console.log("DataRoutes", routes.length, chyk.state.location)
  return (
    <Switch>
      {routes.map((route, i) => {
        const key = route.dataKey && chyk.state.keys[route.dataKey]
        const data = key && chyk.data[key]
        return (
          <Route
            key={route.key || i}
            path={route.path}
            exact={route.exact}
            strict={route.strict}
            render={(_props) => {
              const props = {
                ..._props,
                ...data,
                route: route,
                abortController: chyk.state.abortController,
              }
              // console.log("Route render", chyk.state.keys, route.dataKey, key, data)
              return route.render
                ? route.render(props)
                : route.component && <route.component {...props} />
            }}
          />
        )
      })}
    </Switch>
  )
}
