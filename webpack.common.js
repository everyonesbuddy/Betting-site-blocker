const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");
const HtmlPlugin = require("html-webpack-plugin");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = {
  devtool: "cheap-module-source-map",
  entry: {
    popup: path.resolve(__dirname, "src/popup/popup.tsx"),
    options: path.resolve(__dirname, "src/options/options.tsx"),
    background: path.resolve(__dirname, "src/background/background.ts"),
    contentScript: path.resolve(
      __dirname,
      "src/contentScript/contentScript.ts"
    ),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        use: ["style-loader", "css-loader"],
        test: /\.css$/i,
      },
      {
        type: "asset/resource",
        test: /\.(jpg|jpeg|png|woff|woff2|eot|ttf|svg)$/,
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin({
      cleanStaleWebpackAssets: false,
    }),
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "src/static"),
          to: path.resolve(__dirname, "dist"),
        },
      ],
    }),
    ...getHtmlPlugin(["popup", "options"]),
  ],
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "[name].js",
    path: path.resolve(__dirname, "dist"),
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
};

function getHtmlPlugin(chunks) {
  return chunks.map(
    (chunk) =>
      new HtmlPlugin({
        title: "React Extension",
        filename: `${chunk}.html`,
        chunks: [chunk],
      })
  );
}
