import React, { FC, useEffect, useState } from "react"
import { Route, Switch, useHistory } from "react-router"
import { RouteConfig } from "react-router-config"
import { Chyk, TBranchItem, TRouteConfig } from "./chyk"

export type TReactRouterRouteConfig = RouteConfig & TRouteConfig
export type TGetBranch = (routes: TRouteConfig[], pathname: string) => TBranchItem[]

type TDataRoutesProps = {
  routes: TReactRouterRouteConfig[]
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

const usePreloader = (chyk: Chyk, routes: TReactRouterRouteConfig[], getBranch: TGetBranch) => {
  const history = useHistory()
  const [, set_render_location] = useState(chyk.state.location)

  useEffect(() => {
    history.listen(async (new_location, action) => {
      chyk.abortLoading()
      const branch = getBranch(routes, new_location.pathname)
      await chyk.loadData(branch, new_location.pathname, action)
      set_render_location(new_location)
    })
  }, [])

  return chyk.state.location
}

export const Preloader: FC<{
  chyk: Chyk
  routes: TReactRouterRouteConfig[]
  getBranch: TGetBranch
}> = ({ children, chyk, routes, getBranch }) => {
  const render_location = usePreloader(chyk, routes, getBranch)
  return <Route location={render_location} render={() => children} />
}
