import React, { createContext, FC, useContext, useEffect, useState } from "react"
import { Route, useHistory } from "react-router"
import { Chyk, TGetBranch } from "./chyk"
import { TRouteConfig } from "./match"

export const ChykContext = createContext((null as any) as Chyk)
export function useChyk(): Chyk {
  return useContext(ChykContext)
}

const usePreloader = (routes: TRouteConfig[], getBranch: TGetBranch) => {
  const chyk = useChyk()
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

export const Preloader: FC<{ routes: TRouteConfig[]; getBranch: TGetBranch }> = ({
  children,
  routes,
  getBranch,
}) => {
  const render_location = usePreloader(routes, getBranch)
  return <Route location={render_location} render={() => children} />
}
