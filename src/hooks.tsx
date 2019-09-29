import { createContext, useContext } from "react"
import { Chyk } from "./chyk"

export const ChykContext = createContext({} as Chyk)
export const useChykContext = (): Chyk => useContext(ChykContext)
export const useUrl = () => useChykContext().url
