
import * as vscode from 'vscode';

import { EmmyAttachDebuggerProvider } from './EmmyAttachDebuggerProvider';
// import { EmmyLaunchDebuggerProvider } from './EmmyLaunchDebuggerProvider';
// import { EmmyDebuggerProvider } from './EmmyDebuggerProvider';

/** 注册调试器 */
export function registerDebuggers(context: vscode.ExtensionContext) {

    const emmyAttachProvider = new EmmyAttachDebuggerProvider('openresty_attach', context);
    context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('openresty_attach', emmyAttachProvider));
    context.subscriptions.push(emmyAttachProvider);

    // const emmyProvider = new EmmyDebuggerProvider('emmylua_new', context);
    // context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider("emmylua_new", emmyProvider));
    // context.subscriptions.push(emmyProvider);

    // const emmyLaunchProvider = new EmmyLaunchDebuggerProvider('emmylua_launch', context);
    // context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('emmylua_launch', emmyLaunchProvider));
    // context.subscriptions.push(emmyLaunchProvider);

}
