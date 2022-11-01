import {
    Uri,
    Range,
    languages,
    TextDocument,
    DocumentLink,
    DocumentLinkProvider,
    ExtensionContext,
    CancellationToken,
    DocumentSelector
} from "vscode";

const selector: DocumentSelector = [{ pattern: "**/.orpmrc" }];

export class GitHubRepoLink implements DocumentLinkProvider {
    constructor(context: ExtensionContext) {
        const provider = languages.registerDocumentLinkProvider(selector, this);
        context.subscriptions.push(provider);
    }

    async provideDocumentLinks(document: TextDocument, token: CancellationToken) {
        const regex = /"([\w-]+)\/([\w-]+)"\s*:\s*".*"/g;
        const codes: string = document.getText();
        const links: DocumentLink[] = [];

        try {
            while (!token.isCancellationRequested) {
                const matched = regex.exec(codes);
                if (!matched) {break;}

                const author = matched[1];
                const repo   = matched[2];

                const isLuaRocks = author.toLowerCase() === "rocks";

                let offset1 = matched.index + 1;
                let offset2 = offset1 + author.length + 1;
                let range = new Range(document.positionAt(offset1), document.positionAt(offset2));

                let uri = isLuaRocks ?
                    Uri.parse(`https://luarocks.org/`) :
                    Uri.parse(`https://github.com/${ author }`) ;

                links.push(new DocumentLink(range, uri));

                offset1 = offset2 ;
                offset2 = offset1 + repo.length;
                range = new Range(document.positionAt(offset1), document.positionAt(offset2));
                uri = isLuaRocks ?
                    Uri.parse(`https://luarocks.org/search?q=${ repo }`) :
                    Uri.parse(`https://github.com/${ author }`) ;
                links.push(new DocumentLink(range, uri));

            }
        } catch (ex) {
            console.error(ex);
        }
        return links;
    }

    resolveDocumentLink(link: DocumentLink) {
        return link;
    }
}
