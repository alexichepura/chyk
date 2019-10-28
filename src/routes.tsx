import React, { FC } from "react"
import { Route, Switch } from "react-router"
import { useChyk } from "./hooks"
import { TRouteConfig } from "./match"

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
        const ctx = chyk.currentLocationState
        const keyData = (ctx.data && route.dataKey && ctx.data[route.dataKey]) || undefined
        return (
          <Route
            key={route.key || i}
            path={route.path}
            exact={route.exact}
            strict={route.strict}
            render={props =>
              (route.render &&
                route.render({
                  ...props,
                  ...extraProps,
                  ...keyData,
                  route: route,
                  abortController: ctx.abortController,
                })) ||
              (route.component && (
                <route.component
                  {...props}
                  {...extraProps}
                  {...keyData}
                  route={route}
                  abortController={ctx.abortController}
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
