import GasPlugin from "gas-webpack-plugin";
import { fileURLToPath } from "node:url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const entry = "./build/index.js";

export default {
  // we always use dev mode because bundle size is unimportant - code runs server-side
  mode: "development",
  context: __dirname,
  entry,
  output: {
    path: __dirname,
    filename: "Code.js",
  },
  plugins: [
    new GasPlugin({
      autoGlobalExportsFiles: [entry],
    }),
  ],
  devtool: false,
};
