import * as assert from "assert";
import * as vscode from "vscode";
import { dedent } from "../utils/utils";

async function genericTest(
  input: string,
  expected: string,
  options?: vscode.TextEditorOptions
) {
  await vscode.env.clipboard.writeText(input);

  const doc = await vscode.workspace.openTextDocument({
    language: "python",
    content: ""
  });
  const editor = await vscode.window.showTextDocument(doc);

  if (editor && options) {
    editor.options = options;
  }

  editor.selection = new vscode.Selection(0, 0, 0, 0);

  await vscode.commands.executeCommand("json-to-pydantic.generatePydanticCode");

  const result = editor.document.getText().replace(/\r\n/g, "\n");

  assert.strictEqual(result, expected);
}

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Should get the clipboard text, generate the correspondent Python code and paste in the editor", async () => {
    const input = dedent`
      {
        "name": "John Doe",
        "age": 30
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from pydantic import BaseModel


      class Model(BaseModel):
          name: str
          age: int
    `;

    await genericTest(input, expected);
  });

  test("Should indent generated code with the actual editor indentation config", async () => {
    const input = dedent`
      {
        "name": "John Doe",
        "age": 30
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from pydantic import BaseModel


      class Model(BaseModel):
        name: str
        age: int
    `;

    await genericTest(input, expected, {
      tabSize: 2,
      insertSpaces: true
    });
  });
});

