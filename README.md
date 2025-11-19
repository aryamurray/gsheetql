# gsheetql

A SQL interface for Google Sheets powered by Google Apps Script. Write standard SQL queries against your spreadsheets using an HTTP API compatible with [libsql](https://libsql.org/) server conventions.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What you need to install the software:

*   [Node.js](https://nodejs.org/) (v18 or higher) or [Bun](https://bun.sh/)
*   A [Google Account](https://accounts.google.com/signup)

### Installing

A step-by-step series of examples that tell you how to get a development environment running.

1.  **Clone the repository**
    ```sh
    git clone https://github.com/your-username/gsheetql.git
    cd gsheetql
    ```

2.  **Install dependencies**
    ```sh
    npm install
    ```

3.  **Authenticate with Google**
    This command will open a browser window to log in to your Google account and authorize `clasp`, the command-line tool for Apps Script.
    ```sh
    npm run login
    ```

4.  **Deploy the project**
    This will build the project and deploy it as a web app on Google Apps Script.
    ```sh
    npm run deploy
    ```
    After deployment, the script will output a URL. You can use this URL to send requests to your gsheetql instance.

## Running the tests

You can run the automated tests for this system using `vitest`.

```sh
npm run test
```

For an interactive UI, run:
```sh
npm run test:ui
```

## Deployment

Deploy the project to Google Apps Script as a web app. The `deploy` script in `package.json` handles the build and deployment process.

```sh
npm run deploy
```

## Built With

*   [TypeScript](https://www.typescriptlang.org/) - The language used to write the code
*   [Google Apps Script](https://developers.google.com/apps-script) - The runtime environment
*   [Vitest](https://vitest.dev/) - The testing framework
*   [Webpack](https://webpack.js.org/) - Module bundler

## Contributing

Contributions are welcome. Please see `docs/IMPLEMENT.md` for the project's implementation status and future plans.

## Author

*   **Arya Murray**

## License

This project is licensed under the MIT License.