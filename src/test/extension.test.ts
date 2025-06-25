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

async function errorTest(input: string, error: string) {
  await vscode.env.clipboard.writeText(input);

  const showErrorSpy = sinon.spy(vscode.window, "showErrorMessage");

  try {
    await vscode.commands.executeCommand(
      "json-to-pydantic.generatePydanticCode"
    );

    assert.ok(showErrorSpy.calledOnce);

    const msg = showErrorSpy.getCall(0).args[0];

    assert.strictEqual(msg, error);
  } finally {
    showErrorSpy.restore();
  }
}

async function testWithTemporaryConfig(
  configs: Record<string, any>,
  fn: () => Promise<void>
) {
  const config = vscode.workspace.getConfiguration("json-to-pydantic");

  const originalValues: Record<string, any> = {};
  for (const key of Object.keys(configs)) {
    originalValues[key] = config.get(key);

    await config.update(key, configs[key], vscode.ConfigurationTarget.Global);
  }

  try {
    return await fn();
  } finally {
    for (const key of Object.keys(configs)) {
      await config.update(
        key,
        originalValues[key],
        vscode.ConfigurationTarget.Global
      );
    }
  }
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

  test("Should indent generated code with the actual editor indentation config (using spaces)", async () => {
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

  test("Should indent generated code with the actual editor indentation config (using tabs)", async () => {
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
      \tname: str
      \tage: int
    `;

    await genericTest(input, expected, {
      tabSize: 3,
      insertSpaces: false
    });
  });

  test("Should show an error message when the input is invalid (generatePydanticCode error)", async () => {
    errorTest("[]", "Error: Input must be an object or an array of objects");
  });

  test("Should show an error message when the input is invalid (JSON parser error)", async () => {
    errorTest("test", "Error: Selected string is not a valid JSON");
  });

  test("Should set the configurated name to root class", async () => {
    const input = dedent`
      {
        "name": "John Doe",
        "age": 30
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from pydantic import BaseModel


      class Root(BaseModel):
          name: str
          age: int
    `;

    const configs = {
      defaultRootClassName: "Root"
    };

    await testWithTemporaryConfig(configs, () => genericTest(input, expected));
  });

  test('Should apply configured "preferClassReuse" flag', async () => {
    const input = dedent`
      {
        "user1": { "name": "Alice" },
        "user2": { "name": "Bob" } 
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from pydantic import BaseModel


      class User1(BaseModel):
          name: str


      class Model(BaseModel):
          user1: User1
          user2: User1
    `;

    const configs = {
      preferClassReuse: true
    };

    await testWithTemporaryConfig(configs, () => genericTest(input, expected));
  });
});

