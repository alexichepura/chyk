import { Container } from "inversify"
import { createContext, useContext } from "react"

export const DiContext = createContext({} as Container)
export const DiContextProvider = DiContext.Provider
export const useDiContainer = () => useContext(DiContext)
