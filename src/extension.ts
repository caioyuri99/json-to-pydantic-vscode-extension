import {
  generatePydanticCode,
  InvalidJSONString
} from "json-to-pydantic-code-generator";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "json-to-pydantic.generatePydanticCode",
    async () => {
      const editor = vscode.window.activeTextEditor;

      if (!editor) {
        return;
      }

      const clipboardContent = await vscode.env.clipboard.readText();

      try {
        const config = vscode.workspace.getConfiguration("json-to-pydantic");

        const className = config.get<string>("defaultRootClassName");
        const preferClassReuse = config.get<boolean>("preferClassReuse");

        const options = editor.options;

        const code = generatePydanticCode(clipboardContent, className, {
          indentation: Number(options.tabSize),
          useTabs: !options.insertSpaces,
          preferClassReuse: preferClassReuse
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

