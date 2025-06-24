import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
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

  test("Should show an error message when the input is invalid (generatePydanticCode error)", async () => {
    await vscode.env.clipboard.writeText("[]");

    const showErrorSpy = sinon.spy(vscode.window, "showErrorMessage");

    try {
      await vscode.commands.executeCommand(
        "json-to-pydantic.generatePydanticCode"
      );

      assert.ok(showErrorSpy.calledOnce);

      const msg = showErrorSpy.getCall(0).args[0];

      assert.strictEqual(
        msg,
        "Error: Input must be an object or an array of objects"
      );
    } finally {
      showErrorSpy.restore();
    }
  });

  test("Should show an error message when the input is invalid (JSON parser error)", async () => {
    await vscode.env.clipboard.writeText("test");

    const showErrorSpy = sinon.spy(vscode.window, "showErrorMessage");

    try {
      await vscode.commands.executeCommand(
        "json-to-pydantic.generatePydanticCode"
      );

      assert.ok(showErrorSpy.calledOnce);

      const msg = showErrorSpy.getCall(0).args[0];

      assert.strictEqual(msg, "Error: Selected string is not a valid JSON");
    } finally {
      showErrorSpy.restore();
    }
  });
});

