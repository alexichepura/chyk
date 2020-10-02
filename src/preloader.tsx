import React, { FC, useEffect, useState } from "react"
import { Route } from "react-router"
import { useChyk } from "."

const usePreloader = () => {
  const chyk = useChyk()
  const [, set_render_location] = useState(chyk.locationState.location) // just to rerender

  useEffect(() => {
    chyk.history?.listen(async (new_location) => {
      const location = chyk.locationState.location
      console.log("listen", { ...location }, { ...new_location })
      if (location.pathname === new_location.pathname) {
        return
      }
      chyk.abortLoading()
      if (chyk.getLocationState(new_location.pathname)) {
        return
      }
      const is_success = await chyk.loadData(new_location)
      chyk.cleanLocationState(is_success ? location.pathname : new_location.pathname)
      set_render_location(new_location)
    })
  }, [])

  return chyk.locationState.location
}

export const Preloader: FC = ({ children }) => {
  const render_location = usePreloader()
  return <Route location={render_location} render={() => children} />
}
Preloader.displayName = "Preloader"
