<div align="center">
    <img src="./.github/images/orion-logo-rounded.png" width="128" alt="Orion Hosting Logo">
    <h1>@orionhosting/cli</h1>
    <p>
        <a href="https://orionhost.xyz/discord"><img src="https://img.shields.io/discord/1306734190238371860?color=5865F2&logo=discord&logoColor=white" alt="Discord server" /></a>
        <a href="https://www.npmjs.com/package/@orionhosting/cli"><img src="https://img.shields.io/npm/v/@orionhosting/cli.svg?maxAge=3600" alt="npm version" /></a>
        <a href="https://www.npmjs.com/package/@orionhosting/cli"><img src="https://img.shields.io/npm/dt/@orionhosting/cli.svg?maxAge=3600" alt="npm downloads" /></a>
        <a href="https://github.com/voctal/orion-cli/commits/main"><img alt="Last commit" src="https://img.shields.io/github/last-commit/voctal/orion-cli?logo=github&logoColor=ffffff" /></a>
    </p>
</div>

## About

`@orionhosting/cli` is the official [Orion Hosting](https://orionhosting.xyz) command line interface (CLI) to manage your server from your local terminal. After linking a directory to your server, you can run `orion deploy` to push and restart your Orion's server.

Read the CLI documentation [here](https://docs.orionhost.xyz/guides/cli).

## Installation

Node.js 22 or newer is required.

```sh
npm install -g @orionhosting/cli
```

## Usage

### Global commands

```sh
# Help commands
orion --help
orion --version
orion help [command]

# Login to your account
orion login
```

### Project commands

Be sure to be in your project's folder before running this.

```sh
# Link the current directory to your server
orion link

# Get the status of the linked server
orion status

# Deploy the local project to the linked server
orion deploy
```

## Links

- [Orion Discord](https://orionhost.xyz/discord)
- [GitHub](https://github.com/voctal/orion-cli)
- [npm](https://npmjs.com/package/@orionhosting/cli)
- [Voctal](https://voctal.dev)
- [Octara](https://octara.xyz)

## Help

Need help with the CLI? Ask on our [support server!](https://orionhost.xyz/discord)
