import { createContext, useContext } from "react"
import { Chyk } from "./chyk"

export const ChykContext = createContext((null as any) as Chyk)
export const useChyk = (): Chyk => useContext(ChykContext)
export const useUrl = () => useChyk().url
