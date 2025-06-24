import { generatePydanticCode } from "json-to-pydantic-code-generator";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "json-to-pydantic.generatePydanticCode",
    async () => {
      try {
        const editor = vscode.window.activeTextEditor;

        if (!editor) {
          return;
        }

        const clipboardContent = await vscode.env.clipboard.readText();

        const options = editor.options;

        const json = JSON.parse(clipboardContent);

        const code = generatePydanticCode(json, "Model", {
          indentation: Number(options.tabSize),
          useTabs: !options.insertSpaces
        });

        const cursorPosition = editor.selection.active;

        await editor.edit((editBuilder) => {
          editBuilder.insert(cursorPosition, code);
        });
      } catch (error: any) {
        vscode.window.showErrorMessage(
          `Error: ${error.message ?? String(error)}`
        );
      }
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}

