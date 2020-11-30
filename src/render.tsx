import React, { createContext, FC, useContext, useEffect, useState } from "react"
import { Route, useHistory } from "react-router"
import { Chyk } from "./chyk"
import { useRoute } from "./routes"

export const ChykContext = createContext((null as any) as Chyk)
export function useChyk(): Chyk {
  return useContext(ChykContext)
}

const usePreloader = () => {
  const chyk = useChyk()
  const history = useHistory()
  const [, set_render_location] = useState(chyk.state.location)
  const r = useRoute()

  useEffect(() => {
    history.listen(async (new_location, action) => {
      chyk.abortLoading()
      const branch = chyk.getBranches(r.route.routes || [], new_location.pathname)
      await chyk.loadData(branch, new_location.pathname, action)
      set_render_location(new_location)
    })
  }, [])

  return chyk.state.location
}

export const Preloader: FC = ({ children }) => {
  const render_location = usePreloader()
  return <Route location={render_location} render={() => children} />
}
