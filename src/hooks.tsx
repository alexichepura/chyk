import { createContext, useContext } from "react"
import { Chyk } from "./chyk"

export const ChykContext = createContext((null as any) as Chyk)
export function useChyk<D = any>(): Chyk<D> {
  return useContext(ChykContext)
}
