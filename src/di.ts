import { Container, interfaces } from "inversify"
import { useDiContainer } from "./di-context"
import { Symbols } from "./symbols"

export const useUrl = () => {
  return useDiContainer().get(Symbols.url)
}

export const bind_as_singletone = (container: Container) => (
  singletone_service: interfaces.ServiceIdentifier<any>
) =>
  container
    .bind(singletone_service)
    .toSelf()
    .inSingletonScope()
