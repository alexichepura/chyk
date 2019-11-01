import React, { FC, useState } from "react"
import { useChyk } from "."
import { useLocation, Route } from "react-router"

function createKey(keyLength: number = 6) {
  return Math.random()
    .toString(36)
    .substr(2, keyLength)
}

export const ChykPreloader: FC = ({ children }) => {
  const chyk = useChyk()
  const location = useLocation()
  const [render_key, set_render_key] = useState(location.key)

  if (render_key !== location.key) {
    chyk.abortLoading()
    const key = location.key || createKey() // location.key is undefined on history back
    location.key = key
    if (!chyk.getLocationState(key)) {
      chyk
        .loadData(location)
        .then(() => {
          chyk.cleanLocationState(render_key)
          set_render_key(key)
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
ChykPreloader.displayName = "ChykPreloader"
