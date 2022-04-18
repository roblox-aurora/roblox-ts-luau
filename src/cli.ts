#!/usr/bin/env node

import yargs from "yargs";

void yargs
  // help
	.usage("rbxts-luau - A Roblox TypeScript to Luau package converter")
	.help("help")
	.alias("h", "help")
	.describe("help", "show help information")

  // version
	.version(require("../package.json").version)
	.alias("v", "version")
	.describe("version", "show version information")

  // commands
  .commandDir("commands")
  .demandCommand()
  .parse();
