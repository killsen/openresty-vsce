/* eslint-disable no-undef */
import { execFile } from 'child_process';

export interface Option {
    cwd: string,
    maxBuffer: number
}

export enum ErrorCode {
    Cancel,
    BufferLimitExceed
}

export interface Result {
    error: Error,
    stdout: string,
    stderr: string
}

export interface FailedExecution {
    errorCode: ErrorCode;
    result?: Result;
}

export function processString(cmd: string, args: string[], opt: Option, input: string): Thenable<Result> {
    return new Promise((resolve, reject) => {
        let proc = execFile(cmd, args, opt,
            (error, stdout, stderr) => {
                if (error !== null && error.message === 'stdout maxBuffer exceeded.') {
                    reject(<FailedExecution>{
                        errorCode: ErrorCode.BufferLimitExceed,
                        result: <Result>{ error, stdout, stderr }
                    });
                } else {
                    resolve(<Result>{ error, stdout, stderr });
                }
            });
        proc.stdin?.end(input);
    });
}
