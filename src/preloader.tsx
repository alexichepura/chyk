import React, { FC, useState } from "react"
import { useChyk } from "."
import { useLocation, Route } from "react-router"

export const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  const location = useLocation()
  const [render_key, set_render_key] = useState(location.key)

  if (render_key !== location.key) {
    chyk.abortLoading()

    if (!chyk.getLocationState(location.key)) {
      chyk
        .loadData(location)
        .then(() => {
          chyk.cleanLocationState(render_key)
          set_render_key(location.key)
        })
        .catch(err => {
          if (err.name === "AbortError") {
            // request was aborted, so we don't care about this error
            console.log("AbortError", err)
          } else {
            throw err
          }
        })
    }
  }

  return <Route location={chyk.currentLocationState.location} render={() => children} />
}
