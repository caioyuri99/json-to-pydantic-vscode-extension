import { generatePydanticCode } from "json-to-pydantic-code-generator";
import * as vscode from "vscode";

function generateCode(json: string, editor: vscode.TextEditor): string | void {
  try {
    const config = vscode.workspace.getConfiguration("json-to-pydantic");

    const className = config.get<string>("defaultRootClassName");
    const preferClassReuse = config.get<boolean>("preferClassReuse");

    type ForceOptional = "None" | "OnlyRootClass" | "AllClasses";

    const forceOptional = config.get<ForceOptional>("forceOptional");

    const aliasCamelCase = config.get<boolean>("aliasCamelCase");

    const options = editor.options;

    return generatePydanticCode(json, className, {
      indentation: Number(options.tabSize),
      useTabs: !options.insertSpaces,
      preferClassReuse,
      forceOptional,
      aliasCamelCase
    });
  } catch (error: any) {
    vscode.window.showErrorMessage(`Error: ${error.message ?? String(error)}`);
  }
}

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "json-to-pydantic.generateFromClipboard",
      async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
          return;
        }

        const clipboardContent = await vscode.env.clipboard.readText();

        const code = generateCode(clipboardContent, editor);

        if (!code) {
          return;
        }

        const cursorPosition = editor.selection.active;

        await editor.edit((editBuilder) => {
          editBuilder.insert(cursorPosition, code);
        });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "json-to-pydantic.generateFromSelection",
      async () => {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
          return;
        }

        const selection = editor.selection;

        const selectedText = editor.document.getText(selection);

        if (selectedText === "") {
          vscode.window.showErrorMessage("Error: No selected text.");

          return;
        }

        const code = generateCode(selectedText, editor);

        if (!code) {
          return;
        }

        const docName = "JSON_to_Pydantic.py";
        const docUri = vscode.Uri.parse(`untitled:${docName}`);

        const doc = await vscode.workspace.openTextDocument(docUri);
        const openedEditor = await vscode.window.showTextDocument(
          doc,
          vscode.ViewColumn.Beside
        );

        await openedEditor.edit((e) => {
          e.insert(new vscode.Position(0, 0), code);
        });
      }
    )
  );
}

export function deactivate() {}

