/* eslint-disable no-undef */
import * as vscode from 'vscode';
import * as path from 'path';

import * as luacheck from './luacheck';
import * as execution from './execution';

// :line:range: (code) message
const diagnosticRe = /^:(\d+):(\d+)-(\d+): \(([EW])\d+\) (.+)$/;
function str2diagserv(str: string): vscode.DiagnosticSeverity {
    switch (str) {
        case 'E':
            return vscode.DiagnosticSeverity.Error;
        case 'W':
            return vscode.DiagnosticSeverity.Warning;
        default:
            return vscode.DiagnosticSeverity.Information;
    }
}

export class DiagnosticProvider {
    provideDiagnostic(document: vscode.TextDocument): Thenable<vscode.Diagnostic[]> {
        return this.fetchDiagnostic(document).then((data) => { return this.parseDiagnostic(document, data); },
            (e: execution.FailedExecution) => {
                if (e.errorCode === execution.ErrorCode.BufferLimitExceed) {
                    vscode.window.showWarningMessage(
                        'Diagnostic was interpreted due to lack of buffer size. ' +
                        'The buffer size can be increased using `luacheck.maxBuffer`. '
                    );
                }
                return '';
            });
    }

    fetchDiagnostic(document: vscode.TextDocument): Thenable<string> {
        let [cmd, args] = luacheck.check(document);
        return execution.processString(cmd, args, {
            cwd: path.dirname(document.uri.fsPath),
            maxBuffer: luacheck.getConf<number>('maxBuffer', 262144)
        }, document.getText()).then((result) => result.stdout);
    }

    parseDiagnostic(document: vscode.TextDocument, data: string): vscode.Diagnostic[] {
        const prefixLen = document.uri.fsPath.length;
        let result: vscode.Diagnostic[] = [];
        data.split(/\r\n|\r|\n/).forEach((line) => {
            line = line.substring(prefixLen);
            let matched = line.match(diagnosticRe);
            if (!matched) {return;}
            let sline: number = parseInt(matched[1]);
            let schar: number = parseInt(matched[2]);
            let echar: number = parseInt(matched[3]);
            let msg: string = matched[5];
            let type: vscode.DiagnosticSeverity = str2diagserv(matched[4]);
            let range = new vscode.Range(sline - 1, schar - 1, sline - 1, echar);
            result.push(new vscode.Diagnostic(range, msg, type));
        });
        return result;
    }
}
