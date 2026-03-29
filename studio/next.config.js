// File: studio/next.config.js

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
	allowedDevOrigins: ["localhost", "127.0.0.1", "localhost.isobelnet.de"],
};

export default config;

