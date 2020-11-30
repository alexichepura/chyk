import React, { FC, useEffect, useState } from "react"
import { Route, useHistory } from "react-router"
import { TRouteConfig } from "./branch"
import { Chyk, TGetBranch } from "./chyk"

const usePreloader = (chyk: Chyk, routes: TRouteConfig[], getBranch: TGetBranch) => {
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

export const Preloader: FC<{ chyk: Chyk; routes: TRouteConfig[]; getBranch: TGetBranch }> = ({
  children,
  chyk,
  routes,
  getBranch,
}) => {
  const render_location = usePreloader(chyk, routes, getBranch)
  return <Route location={render_location} render={() => children} />
}
