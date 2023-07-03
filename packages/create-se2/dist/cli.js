#!/usr/bin/env node

// src/cli.ts
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { Command } from "commander";
import cpy from "cpy";
import { execa } from "execa";
import fs from "fs-extra";
import prompts from "prompts";
import validateNpmPackageName from "validate-npm-package-name";

// src/detectPackageManager.ts
import { execSync } from "child_process";
function detectPackageManager() {
  try {
    const userAgent = process.env.npm_config_user_agent;
    if (userAgent) {
      if (userAgent.startsWith("pnpm")) {
        return "pnpm";
      } else if (userAgent.startsWith("yarn")) {
        return "yarn";
      } else if (userAgent.startsWith("npm")) {
        return "npm";
      }
    }
    try {
      execSync("pnpm --version", { stdio: "ignore" });
      return "pnpm";
    } catch {
      execSync("yarn --version", { stdio: "ignore" });
      return "yarn";
    }
  } catch {
    return "npm";
  }
}

// src/cli.ts
var log = console.log;
var FriendlyError = class extends Error {
};
async function run() {
  try {
    let projectPath = "";
    const packageJson = createRequire(import.meta.url)("../package.json");
    const program = new Command(packageJson.name).version(packageJson.version).arguments("[project-directory]").usage(`${chalk.green("[project-directory]")} [options]`).action((name) => {
      projectPath = name;
    }).option(
      "--use-npm",
      "Explicitly tell the CLI to bootstrap the app using npm"
    ).option(
      "--use-yarn",
      "Explicitly tell the CLI to bootstrap the app using Yarn"
    ).option(
      "--use-pnpm",
      "Explicitly tell the CLI to bootstrap the app using pnpm"
    ).option("--skip-git", "Skip initializing a git repository").allowUnknownOption().parse(process.argv);
    const options = program.opts();
    const reservedPackageNames = [
      "@se-2/create-se2",
      "@ethersproject/networks",
      "@ethersproject/web",
      "@heroicons/react",
      "@rainbow-me/rainbowkit",
      "@uniswap/sdk",
      "daisyui",
      "ethers",
      "next",
      "nextjs-progressbar",
      "react",
      "react-blockies",
      "react-copy-to-clipboard",
      "react-dom",
      "react-fast-marquee",
      "react-hot-toast",
      "use-debounce",
      "usehooks-ts",
      "wagmi",
      "zustand"
    ];
    log();
    log(chalk.green(`\u{1F308} Welcome to Scaffold-ETH 2!`));
    const isValidProjectName = (value) => validateNpmPackageName(value).validForNewPackages;
    const invalidProjectNameErrorMessage = "Project name must be a valid npm package name.";
    if (typeof projectPath === "string") {
      projectPath = projectPath.trim();
    }
    if (!projectPath) {
      log();
      const { value } = await prompts({
        initial: "my-se2-app",
        message: "What is the name of your project?",
        name: "value",
        type: "text",
        validate: (value2) => {
          if (!isValidProjectName(value2)) {
            return invalidProjectNameErrorMessage;
          }
          if (reservedPackageNames.includes(value2)) {
            return `"${value2}" is a reserved package name.`;
          }
          return true;
        }
      });
      if (typeof value === "undefined") {
        log();
        return;
      }
      projectPath = value;
    }
    log();
    if (!isValidProjectName(projectPath)) {
      throw new FriendlyError(
        [
          chalk.red(
            `\u{1F440} The project name you provided is not a valid package name.`
          ),
          `\u{1F64F} ${invalidProjectNameErrorMessage}`
        ].join("\n")
      );
    }
    if (reservedPackageNames.includes(projectPath)) {
      throw new FriendlyError(
        [
          chalk.red(
            `\u{1F440} The project name you provided is a reserved package name.`
          ),
          `\u{1F64F} Please use a project name other than "${reservedPackageNames.find(
            (x) => x === projectPath
          )}".`
        ].join("\n")
      );
    }
    const targetPath = path.join(process.cwd(), projectPath);
    if (fs.existsSync(targetPath)) {
      throw new FriendlyError(
        [
          chalk.red(`\u{1F440} The target directory "${projectPath}" already exists.`),
          `\u{1F64F} Please remove this directory or choose a different project name.`
        ].join("\n")
      );
    }
    const __dirname = fileURLToPath(new URL(".", import.meta.url));
    const templatesPath = path.join(__dirname, "..", "templates");
    const templateName = "nextjs";
    const selectedTemplatePath = path.join(templatesPath, templateName);
    log(
      chalk.cyan(
        `\u{1F680} Creating a new Scaffold-ETH 2 app in ${chalk.bold(targetPath)}`
      )
    );
    const ignoreList = ["node_modules", ".next", "CHANGELOG.md"];
    await cpy(path.join(selectedTemplatePath, "**", "*"), targetPath, {
      filter: (src) => ignoreList.every((ignore) => {
        const relativePath = path.relative(selectedTemplatePath, src.path);
        return !relativePath.includes(ignore);
      }),
      rename: (name) => name.replace(/^_dot_/, ".")
    });
    const pkgJson = await fs.readJson(path.join(targetPath, "package.json"));
    pkgJson.name = projectPath;
    pkgJson.version = "0.1.0";
    await fs.writeFile(
      path.join(targetPath, "package.json"),
      JSON.stringify(pkgJson, null, 2)
    );
    const packageManager = options.usePnpm ? "pnpm" : options.useYarn ? "yarn" : options.useNpm ? "npm" : detectPackageManager();
    log(
      chalk.cyan(
        `\u{1F4E6} Installing dependencies with ${chalk.bold(
          packageManager
        )}. This could take a while.`
      )
    );
    await execa(packageManager, ["install"], {
      cwd: targetPath,
      stdio: "inherit"
    });
    if (!options.skipGit) {
      log(chalk.cyan(`\u{1F4DA} Initializing git repository`));
      await execa("git", ["init"], { cwd: targetPath });
      await execa("git", ["add", "."], { cwd: targetPath });
      await execa(
        "git",
        [
          "commit",
          "--no-verify",
          "--message",
          "Initial commit from create-se2"
        ],
        { cwd: targetPath }
      );
    }
    log(chalk.green(`\u{1F308} Done! Thanks for using Scaffold-ETH 2 \u{1F64F}`));
    log();
    log(
      chalk.cyan(
        `\u{1F449} To get started, run ${chalk.bold(
          `cd ${projectPath}`
        )} and then ${chalk.bold(
          `${packageManager}${packageManager === "npm" ? " run" : ""} start`
        )}`
      )
    );
    log();
  } catch (err) {
    if (err instanceof FriendlyError) {
      log(chalk.yellow(err.message));
      process.exit(1);
    } else {
      throw err;
    }
  }
}
run();
