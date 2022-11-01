import * as path from 'path';
import * as vscode from 'vscode';

let mExtensionPath = "";

export function setExtensionPath(extensionPath: string) {
    mExtensionPath = extensionPath;
}

export function getConf<T>(name: string, value: T): T {
    let conf = vscode.workspace.getConfiguration('luacheck');
    return conf.get<T>(name) || value;
}

function appendCheck(parameters: string[], opt: string, args: string[]) {
    if (args.length > 0) {
        parameters.push(opt);
        parameters.push(...args);
    }
}

export function command(...options: string[]): [string, string[]] {
    let cmd = path.join(mExtensionPath, "luacheck", "luacheck.exe");
    let args: string[] = [];
    args.push(...options);
    appendCheck(args, '--globals', getConf<string[]>('globals', []));
    appendCheck(args, '--ignore', getConf<string[]>('ignore', []));
    return [cmd, args];
}

export function check(document: vscode.TextDocument): [string, string[]] {
    return command(
        '--no-cache',
        '--no-color',
        '--codes',
        '--ranges',
        '--formatter', 'plain',
        '--filename', document.uri.fsPath,
        '-');
}

export function version(): [string, string[]] {
    return command("--version");
}
