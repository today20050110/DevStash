// @ts-check
import { module } from "@prisma/composer";
import devstashService from "./service.mjs";

export default module("coding-with-ai-planning-to-production", ({ provision }) => {
  provision(devstashService);
});
