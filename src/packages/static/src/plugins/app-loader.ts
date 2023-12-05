import HtmlWebpackPlugin from "html-webpack-plugin";
import { resolve } from "path";

export default function appLoaderPlugin(
  registerPlugin,
  PRODMODE: boolean,
  title: string,
) {
  registerPlugin(
    "HTML -- generates the app.html file",
    new HtmlWebpackPlugin({
      title,
      filename: "app.html",
      template: resolve(__dirname, "../app.html"),
      hash: PRODMODE,
      chunks: ["load", "app"],
    }),
  );

  registerPlugin(
    "HTML -- generates the compute.html file",
    new HtmlWebpackPlugin({
      title,
      filename: "compute.html",
      template: resolve(__dirname, "../compute.html"),
      hash: PRODMODE,
      chunks: ["load", "compute"],
    }),
  );

  registerPlugin(
    "HTML -- generates the embed.html file",
    new HtmlWebpackPlugin({
      title,
      filename: "embed.html",
      template: resolve(__dirname, "../app.html"),
      hash: PRODMODE,
      chunks: ["load", "embed"],
    }),
  );
}
