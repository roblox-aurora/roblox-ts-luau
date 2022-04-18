import fs from "fs-extra";
import path from "path";
import toml from "@iarna/toml";

interface RojoTreeProperty {
	Type: string;
	Value: unknown;
}

interface RojoTreeMetadata {
	$className?: string;
	$path?: string;
	$properties?: Array<RojoTreeProperty>;
	$ignoreUnknownInstances?: boolean;
}

type RojoTree = RojoTreeMetadata | RojoTreeMembers;

interface RojoTreeMembers {
	[name: string]: RojoTree;
}

export interface RojoFile {
	servePort?: number;
	name: string;
	tree: RojoTree;
}


export interface ProjectWallyConfig {
    username: string;
    packageName: string;
    registry: string;
    license: string;
    realm: "shared";
    description: string;
    authors: string[];
}

export type ProjectWallyConfigIdentity = {[P in keyof ProjectWallyConfig]: ProjectWallyConfig[P]}

export interface BuildConfig {
    outDir: string;
}

export interface ProjectConfig {
    wally: ProjectWallyConfig;
    build: BuildConfig;
}

export function generateWallyToml(wallyConfig: ProjectWallyConfig, version: string, file: string) {
    const wallyToml = {
        package: {
            name: `${wallyConfig.username}/${wallyConfig.packageName}`,
            description: wallyConfig.description,
            realm: wallyConfig.realm,
            license: wallyConfig.license,
            registry: wallyConfig.registry,
            authors: wallyConfig.authors,
            version,
        }
    };

    fs.writeFileSync(file, toml.stringify(wallyToml));
}