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
        const data = route.dataKey
          ? chyk.getLocationRouteData(chyk.locationKey, route.dataKey)
          : undefined
        return (
          <Route
            key={route.key || i}
            path={route.path}
            exact={route.exact}
            strict={route.strict}
            render={props =>
              (route.render && route.render({ ...props, ...extraProps, route: route, ...data })) ||
              (route.component && (
                <route.component {...props} {...extraProps} route={route} {...data} />
              ))
            }
          />
        )
      })}
    </Switch>
  )
}
