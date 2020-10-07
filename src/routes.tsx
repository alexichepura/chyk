import React, { FC } from "react"
import { Route, Switch } from "react-router"
import { TRouteConfig } from "./match"
import { useChyk } from "./render"

type TDataRoutesProps = {
  routes: TRouteConfig[]
  extraProps?: any
  switchProps?: any
}
export const DataRoutes: FC<TDataRoutesProps> = ({ routes, extraProps = {}, switchProps = {} }) => {
  const chyk = useChyk()
  return (
    <Switch {...switchProps}>
      {routes.map((route, i) => {
        const matchKey = route.dataKey && chyk.state.keys[route.dataKey]
        const matchData = matchKey && chyk.data[matchKey]
        return (
          <Route
            key={route.key || i}
            path={route.path}
            exact={route.exact}
            strict={route.strict}
            render={(props) =>
              (route.render &&
                route.render({
                  ...props,
                  ...extraProps,
                  ...matchData,
                  route: route,
                  abortController: chyk.state.abortController,
                })) ||
              (route.component && (
                <route.component
                  {...props}
                  {...extraProps}
                  {...matchData}
                  route={route}
                  abortController={chyk.state.abortController}
                />
              ))
            }
          />
        )
      })}
    </Switch>
  )
}
DataRoutes.displayName = "DataRoutes"
