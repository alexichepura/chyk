import React, { FC, useState } from "react"
import { useChyk } from "."
import { useLocation, Route } from "react-router"

export const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  const location = useLocation()
  const [, set_render_location] = useState(location) // just to rerender

  chyk.handleLocationChange(location).then(should_rerender => {
    should_rerender && set_render_location(location)
  })

  return <Route location={chyk.locationState.location} render={() => children} />
}
ChykPreloader.displayName = "ChykPreloader"
