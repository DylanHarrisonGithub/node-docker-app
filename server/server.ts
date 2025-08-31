import models from "./definitions/models/models"
import services from "./services/services";
import routes from "./routes/routes";
import config from "./config/config";

const server = {
  models: models,
  services: services,
  routes: routes,
  config: config
}

export default server;
