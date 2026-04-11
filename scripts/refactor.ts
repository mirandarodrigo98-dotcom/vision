import { Project, SyntaxKind, CallExpression, PropertyAccessExpression } from 'ts-morph';
import * as path from 'path';

const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

const sourceFiles = project.getSourceFiles();
console.log(`Found ${sourceFiles.length} source files.`);

let filesChanged = 0;

for (const sourceFile of sourceFiles) {
    let changed = false;

    // Helper to replace '?' with '$1', '$2', etc. in SQL strings
    function convertSqlString(sqlText: string) {
        let i = 1;
        let converted = sqlText.replace(/\?/g, () => `$${i++}`);
        converted = converted.replace(/datetime\('now'\)/gi, "NOW()");
        converted = converted.replace(/datetime\("now"\)/gi, "NOW()");
        converted = converted.replace(/datetime\('now',\s*'-03:00'\)/gi, "(NOW() - INTERVAL '3 hours')");
        converted = converted.replace(/datetime\("now",\s*'-03:00'\)/gi, "(NOW() - INTERVAL '3 hours')");
        converted = converted.replace(/datetime\('now',\s*'\+1 hour'\)/gi, "(NOW() + INTERVAL '1 hour')");
        converted = converted.replace(/datetime\("now",\s*'\+1 hour'\)/gi, "(NOW() + INTERVAL '1 hour')");
        converted = converted.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, "SERIAL PRIMARY KEY");
        return converted;
    }

    // 1. Replace all strings matching SQL patterns
    const stringLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.StringLiteral);
    for (let i = stringLiterals.length - 1; i >= 0; i--) {
        const node = stringLiterals[i];
        if (node.wasForgotten()) continue;
        const text = node.getLiteralText();
        if (/(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)/i.test(text) && text.includes('?')) {
            node.replaceWithText(`\`${convertSqlString(text)}\``);
            changed = true;
        }
    }

    const templateLiterals = sourceFile.getDescendantsOfKind(SyntaxKind.NoSubstitutionTemplateLiteral);
    for (let i = templateLiterals.length - 1; i >= 0; i--) {
        const node = templateLiterals[i];
        if (node.wasForgotten()) continue;
        const text = node.getLiteralText();
        if (/(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)/i.test(text) && text.includes('?')) {
            node.replaceWithText(`\`${convertSqlString(text)}\``);
            changed = true;
        }
    }

    // 2. Replace `db.prepare(...).get(...)` with `(await db.query(..., [...])).rows[0]`
    // We must fetch again because the tree changed
    let callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (let i = callExprs.length - 1; i >= 0; i--) {
        const callExpr = callExprs[i];
        if (callExpr.wasForgotten()) continue;

        const expr = callExpr.getExpression();
        if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
            const propAccess = expr as PropertyAccessExpression;
            const methodName = propAccess.getName();
            
            if (['get', 'all', 'run'].includes(methodName)) {
                const prepareCall = propAccess.getExpression();
                if (prepareCall.getKind() === SyntaxKind.CallExpression) {
                    const innerExpr = (prepareCall as CallExpression).getExpression();
                    if (innerExpr.getKind() === SyntaxKind.PropertyAccessExpression) {
                        const innerProp = innerExpr as PropertyAccessExpression;
                        if (innerProp.getExpression().getText() === 'db' && innerProp.getName() === 'prepare') {
                            
                            const sqlArg = (prepareCall as CallExpression).getArguments()[0];
                            if (!sqlArg) continue;
                            const methodArgs = callExpr.getArguments();
                            
                            let sqlText = sqlArg.getText();
                            if (/(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)/i.test(sqlText) && sqlText.includes('?')) {
                                // naive replace for '?'
                                let j = 1;
                                sqlText = sqlText.replace(/\?/g, () => `$${j++}`);
                            }

                            const argsText = methodArgs.length > 0 ? `[${methodArgs.map(a => a.getText()).join(', ')}]` : '[]';
                            
                            let replacement = '';
                            // if the expression is already awaited, e.g. await db.prepare().get()
                            // the AST node for await is parent. If we replace callExpr with (await db.query()).rows[0], 
                            // we'll get await (await db.query()).rows[0] which is valid but redundant.
                            // We can just check the parent.
                            const parent = callExpr.getParent();
                            const isAwaited = parent && parent.getKind() === SyntaxKind.AwaitExpression;
                            
                            if (methodName === 'get') {
                                replacement = `(await db.query(${sqlText}, ${argsText})).rows[0]`;
                            } else if (methodName === 'all') {
                                replacement = `(await db.query(${sqlText}, ${argsText})).rows`;
                            } else if (methodName === 'run') {
                                replacement = `await db.query(${sqlText}, ${argsText})`;
                            }

                            if (isAwaited) {
                                parent.replaceWithText(replacement);
                            } else {
                                callExpr.replaceWithText(replacement);
                            }
                            changed = true;
                        }
                    }
                }
            }
        }
    }

    if (changed) {
        filesChanged++;
        sourceFile.saveSync();
        console.log(`Updated ${sourceFile.getFilePath()}`);
    }
}

console.log(`Total files changed: ${filesChanged}`);
