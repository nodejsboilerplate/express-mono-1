import {
  createControllers,
  createRedisServices,
  createRepositories,
  createServices,
  createValidators,
  createMiddlewares,
} from "./containers";

export const createContainer = () => {
  const redisServiceContainer = createRedisServices();
  const repositoryContainer = createRepositories();
  const validatorContainer = createValidators();

  const serviceContainer = createServices({
    redisServices: redisServiceContainer,
    repositories: repositoryContainer,
    validators: validatorContainer,
  });

  const middlewareContainer = createMiddlewares({
    redisServices: redisServiceContainer,
    repositories: repositoryContainer,
    services: serviceContainer,
    validators: validatorContainer,
  });

  const controllerContainer = createControllers(serviceContainer);

  return {
    serviceContainer,
    controllerContainer,
    redisServiceContainer,
    repositoryContainer,
    validatorContainer,
    middlewareContainer,
  };
};
