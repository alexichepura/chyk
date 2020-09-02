import { Location } from "history"
import React, { FC, useEffect, useState } from "react"
import { Route } from "react-router"
import { useChyk } from "."

export const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  // const location = useLocation()
  const [, set_render_location] = useState(chyk.locationState.location) // just to rerender

  useEffect(() => {
    const switchRoute = (location: Location) => {
      chyk.handleLocationChange(location).then((should_rerender) => {
        should_rerender && set_render_location(location)
      })
    }
    chyk.switchRoute = switchRoute
  }, [])

  // console.log("ChykPreloader target location: ", location.pathname)

  return <Route location={chyk.locationState.location} render={() => children} />
}
ChykPreloader.displayName = "ChykPreloader"
