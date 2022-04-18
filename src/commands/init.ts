import yargs, { config } from "yargs";
import prompts from "prompts";
import toml from "@iarna/toml";
import fs from "fs-extra";
import { identity } from "../identity";
import path from "path";
import hjson, { SerializeOptions } from "hjson";
import { generateWallyToml, ProjectConfig, ProjectWallyConfig, ProjectWallyConfigIdentity, RojoFile } from "../project";

interface InitOptions {
	rootPath: string;
	luauDir: string;
	packageName?: string;
}

function cleanName(name: string) {
	return name.replace("@", "").replace("/", "-");
}

async function init(argv: yargs.Arguments<InitOptions>) {
	const cwd = path.join(process.cwd(), argv.rootPath);
	const workingPath = path.join(cwd, argv.luauDir);
	const distPath = path.join(workingPath, "dist");

	const tsconfig = path.join(cwd, "tsconfig.json");
	const packageJson = path.join(cwd, "package.json");

	if (!fs.existsSync(packageJson)) {
		return;
	}

	if (!fs.existsSync(tsconfig)) {
		return;
	}

	const packageInfo = require(packageJson);
	const tsconfigInfo = hjson.parse(fs.readFileSync(tsconfig).toString());

	fs.ensureDirSync(distPath);

	if (!fs.pathExistsSync(workingPath)) {
		fs.mkdirSync(workingPath);
	}

	const wallyConfigs = await prompts([
		{
			name: "publishName",
			type: "text",
			message: "What github username do you want to publish the package under?",
		},
		{
			name: "packageName",
			type: "text",
			message: "What do you want to name the package?",
			initial: argv.packageName ?? cleanName(packageInfo.name),
		},
	]);

	const fullName = `${wallyConfigs.publishName}/${wallyConfigs.packageName}`;

	const configuration = identity<ProjectConfig>({
		wally: {
			username: wallyConfigs.publishName as string,
			packageName: wallyConfigs.packageName as string,
			license: packageInfo.license,
			registry: "https://github.com/upliftgames/wally-index",
			authors: [wallyConfigs.publishName],
			realm: "shared",
			description: packageInfo.description,
		},
		build: {
			outDir: tsconfigInfo.compilerOptions.outDir,
		},
	});

	const rojoConfig = identity<RojoFile>({
		name: wallyConfigs.packageName,
		tree: {
			$path: ".",
		},
	});

    const jsonConfig: SerializeOptions = { quotes: "all", separator: true, space: "\t", bracesSameLine: true };

	fs.writeFileSync(
		path.join(cwd, "luau-config.json"),
		hjson.stringify(configuration, jsonConfig),
	);
	fs.writeFileSync(
		path.join(distPath, "default.project.json"),
		hjson.stringify(rojoConfig, jsonConfig),
	);
    
    generateWallyToml(configuration.wally, packageInfo.version, path.join(distPath, "wally.toml"));
}

export = identity<yargs.CommandModule<{}, InitOptions>>({
	command: "init",
	describe: "Setup Luau project",
	builder: (): yargs.Argv<InitOptions> =>
		yargs
			.option("rootPath", {
				type: "string",
				describe: "The path of your project - defaults to current directory",
				default: ".",
			})
			.option("luauDir", {
				default: "luau",
				describe: "The name of the Luau directory",
				type: "string",
			})
			.option("packageName", {
				describe: "The name of the package",
				type: "string",
			}),
	handler: argv => init(argv),
});
