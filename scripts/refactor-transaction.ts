import * as fs from 'fs';
import * as path from 'path';
import { Project, SyntaxKind, CallExpression } from 'ts-morph';

const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
});

const sourceFiles = project.getSourceFiles();
let filesChanged = 0;

for (const sourceFile of sourceFiles) {
    let changed = false;

    // Look for `db.transaction(...)`
    const callExprs = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (let i = callExprs.length - 1; i >= 0; i--) {
        const callExpr = callExprs[i];
        if (callExpr.wasForgotten()) continue;

        const exprText = callExpr.getExpression().getText();
        if (exprText === 'db.transaction') {
            // Found db.transaction
            const parent = callExpr.getParent();
            
            // Case 1: `await db.transaction(...)()`
            if (parent && parent.getKind() === SyntaxKind.CallExpression) {
                const parentCall = parent as CallExpression;
                if (parentCall.getExpression() === callExpr) {
                    // Replace the parent call with just `await db.transaction(...)`
                    const args = parentCall.getArguments();
                    const argsText = args.length > 0 ? args.map(a => a.getText()).join(', ') : '';
                    
                    // The inner function usually takes args too, but here we are calling it.
                    // Wait, if it's `db.transaction(fn)(args)`, we should change it to `db.transaction(() => fn(args))`
                    // Or just change `db.transaction(fn)` to execute `fn` immediately.
                    // Let's rewrite `db.transaction` in `db.ts` to take `(callback)` and execute it.
                    // Then `db.transaction(fn)(args)` -> `db.transaction(() => fn(args))`
                    const fnArg = callExpr.getArguments()[0];
                    if (fnArg) {
                        parentCall.replaceWithText(`db.transaction(() => (${fnArg.getText()})(${argsText}))`);
                        changed = true;
                    }
                }
            } else if (parent && parent.getKind() === SyntaxKind.VariableDeclaration) {
                // Case 2: `const txn = db.transaction(fn); await txn(args);`
                // This is harder. Let's just manually fix these if they exist, or we can replace `txn(args)` with `db.transaction(() => fn(args))`
                console.log(`Found variable declaration for db.transaction in ${sourceFile.getFilePath()}`);
            }
        }
    }

    if (changed) {
        filesChanged++;
        sourceFile.saveSync();
        console.log(`Updated ${sourceFile.getFilePath()}`);
    }
}
