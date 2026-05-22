require('dotenv').config();

module.exports = {
  username: process.env.DOCKERHUB_USERNAME,
  token: process.env.DOCKERHUB_TOKEN,
  baseUrl: `https://hub.docker.com/v2/repositories/${process.env.DOCKERHUB_USERNAME}`
};
