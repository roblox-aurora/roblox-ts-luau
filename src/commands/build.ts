import yargs from "yargs";
import fs, { copySync } from "fs-extra";
import { identity } from "../identity";
import path from "path";
import hjson from "hjson";
import execa from "execa";
import util from "util";
import File from "vinyl";
import { generateWallyToml, ProjectConfig } from "../project";
import _copy from "copy";
const copy = util.promisify(_copy);

interface BuildOptions {
	rootPath: string;
	luauDir: string;
	publish: boolean;
}

async function build(argv: yargs.Arguments<BuildOptions>) {
	const rootPath = path.join(process.cwd(), argv.rootPath);
	const luauPath = path.join(rootPath, argv.luauDir);
	const luauDistPath = path.join(luauPath, "dist");
	const luauOutputPath = path.join(luauPath, "out");
	const luauArtefactPath = path.join(luauPath, "artefacts");

	const config = path.join(rootPath, "luau-config.json");
	if (!fs.existsSync(config)) {
		return;
	}

	const configuration = hjson.parse(fs.readFileSync(config).toString()) as ProjectConfig;
	const packageJson = require(path.join(rootPath, "package.json"));

	console.log("generating wally.toml...");
	generateWallyToml(configuration.wally, packageJson.version, path.join(luauDistPath, "wally.toml"));

	const projectPath = path.join(luauPath, "build.project.json");

	if (!fs.existsSync(projectPath)) {
		return;
	}

	const result = execa.command(`rbxtsc --verbose --type=model --rojo="${projectPath}"`);
	result.stdout?.on("data", data => {
		process.stdout.write(`${data}`);
	});
	await result;

	console.log(`compiled ${configuration.wally.packageName}`);

	const copyCallback =
		(prefix: string = "emit") =>
		(err: Error | null, files: File[] | undefined) => {
			if (files) {
				for (const file of files) {
					console.log(prefix, file.path);
				}
			}

			if (err) {
				console.error(err);
			}
		};

	console.log("copying output files...");

    const libPath = path.join(luauOutputPath, "lib");

	await copy(`${path.join(rootPath, configuration.build.outDir)}/**/*.lua`, libPath);
	await copy(`${luauDistPath}/*.*`, luauOutputPath);
	await copy(`${rootPath}/include/*.lua`, path.join(libPath, "TS"));
	for (const [packageName] of Object.entries(packageJson.dependencies as { [name: string]: string })) {
		await copy(
			`${rootPath}/node_modules/${packageName}/**/*.lua`,
			path.join(libPath, "TS", packageName),
		);
	}

	fs.ensureDir(luauArtefactPath);
	execa.commandSync(
		`wally package --project-path ${luauOutputPath} --output ${path.join(
			luauArtefactPath,
			`${configuration.wally.packageName}-luau.zip`,
		)}`,
	);
	execa.commandSync(
		`rojo build ${projectPath} --output ${path.join(
			luauArtefactPath,
			`${configuration.wally.packageName}-luau.rbxm`,
		)}`,
	);

	if (argv.publish) {
        execa.commandSync(
            `wally publish --project-path ${luauOutputPath}`,
        );
	}
}

export = identity<yargs.CommandModule<{}, BuildOptions>>({
	command: "build",
	describe: "Build Luau project",
	builder: (): yargs.Argv<BuildOptions> =>
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
			.option("publish", {
				type: "boolean",
				default: false,
			}),
	handler: argv => build(argv),
});
