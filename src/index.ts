import { baseConfig } from "./config";
import { redisClient } from "./libs";
import { app } from "./server";

app.listen(baseConfig.PORT, async () => {
  console.log(await redisClient.ping());
  console.log(`Server is listening on port: ${baseConfig.PORT}`);
});
