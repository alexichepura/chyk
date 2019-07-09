import { Container, interfaces } from "inversify"
import { createContext, useContext } from "react"

const DiContext = createContext({} as Container)
export const DiContextProvider = DiContext.Provider
export const useDiContainer = () => useContext(DiContext)

export const bind_as_singletone = (container: Container) => (
  singletone_service: interfaces.ServiceIdentifier<any>
) =>
  container
    .bind(singletone_service)
    .toSelf()
    .inSingletonScope()
