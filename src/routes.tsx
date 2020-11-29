import React, { createContext, FC, useContext } from "react"
import { Route, Switch } from "react-router"
import { Chyk } from "./chyk"
import { TRouteConfig } from "./match"

type TRouteProps<T = any> = {
  data: T
  route: TRouteConfig
}
export const RouteDataContext = createContext<TRouteProps>((null as any) as TRouteProps)
export function useRoute<T>(): TRouteProps<T> {
  return useContext(RouteDataContext)
}

type TDataRoutesProps = {
  routes: TRouteConfig[]
  chyk: Chyk<any>
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, chyk }) => {
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
            render={(props) => {
              return (
                <RouteDataContext.Provider value={{ data, route }}>
                  {(route.render && route.render(props)) ||
                    (route.component && <route.component {...props} />)}{" "}
                </RouteDataContext.Provider>
              )
            }}
          />
        )
      })}
    </Switch>
  )
}
