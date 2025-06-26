import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";
import { dedent } from "../utils/utils";
import { error } from "console";

async function clipboardTest(
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

  await vscode.commands.executeCommand(
    "json-to-pydantic.generateFromClipboard"
  );

  const result = editor.document.getText().replace(/\r\n/g, "\n");

  assert.strictEqual(result, expected);
}

async function errorTest(input: string, error: string, command: string) {
  await vscode.env.clipboard.writeText(input);

  const showErrorSpy = sinon.spy(vscode.window, "showErrorMessage");

  try {
    await vscode.commands.executeCommand(command);

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

suite("Generate from Clipboard Test Suite", () => {
  vscode.window.showInformationMessage("Start clipboard tests.");

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

    await clipboardTest(input, expected);
  });
});

suite("Generate from Selection Test Suite", () => {
  vscode.window.showInformationMessage("Start selection tests.");

  test("Should get the selected text, generate the correspondent Python code and paste in a new editor", async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: dedent`
      {
        "name": "John Doe",
        "age": 30
      }
    `
    });

    const editor = await vscode.window.showTextDocument(doc);

    const start = new vscode.Position(0, 0);
    const end = editor.document.lineAt(editor.document.lineCount - 1).range.end;

    editor.selection = new vscode.Selection(start, end);

    await vscode.commands.executeCommand(
      "json-to-pydantic.generateFromSelection"
    );

    const editors = vscode.window.visibleTextEditors;

    const expectedName = "JSON_to_Pydantic.py";

    const editorUntitled = editors.find(
      (e) =>
        e.document.uri.scheme === "untitled" &&
        e.document.uri.path.endsWith(expectedName)
    );

    assert.ok(editorUntitled, "No untitled archives were opened");

    const uri = editorUntitled.document.uri;

    const realName = uri.path.split("/").pop();
    assert.strictEqual(
      realName,
      expectedName,
      `Incorrect archive name. Expected: ${expectedName}, recieved: ${realName}`
    );

    const expectedContent = dedent`
      from __future__ import annotations

      from pydantic import BaseModel


      class Model(BaseModel):
        name: str
        age: int
    `;
    const realContent = editorUntitled.document
      .getText()
      .replace(/\r\n/g, "\n");
    assert.strictEqual(
      realContent,
      expectedContent,
      "Incorrect archive content"
    );

    assert.strictEqual(
      editorUntitled.viewColumn,
      vscode.ViewColumn.Two,
      'The archive was not opened in "Beside" column'
    );
  });
});

suite("Apply configuration tests", () => {
  vscode.window.showInformationMessage("Start configuration tests.");

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

    await clipboardTest(input, expected, {
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

    await clipboardTest(input, expected, {
      tabSize: 3,
      insertSpaces: false
    });
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

    await testWithTemporaryConfig(configs, () =>
      clipboardTest(input, expected)
    );
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

    await testWithTemporaryConfig(configs, () =>
      clipboardTest(input, expected)
    );
  });

  test('Should apply configured "forceOptional" config ("OnlyRootClass" test)', async () => {
    const input = dedent`
      {
        "name": "Alice",
        "address": {
          "street": "Main St",
          "zip": "12345"
        }
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from typing import Optional

      from pydantic import BaseModel


      class Address(BaseModel):
          street: str
          zip: str


      class Model(BaseModel):
          name: Optional[str] = None
          address: Optional[Address] = None
    `;

    const configs = {
      forceOptional: "OnlyRootClass"
    };

    await testWithTemporaryConfig(configs, () =>
      clipboardTest(input, expected)
    );
  });

  test('Should apply configured "forceOptional" config ("AllClasses" test)', async () => {
    const input = dedent`
      {
        "name": "Alice",
        "address": {
          "street": "Main St",
          "zip": "12345"
        }
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from typing import Optional

      from pydantic import BaseModel


      class Address(BaseModel):
          street: Optional[str] = None
          zip: Optional[str] = None


      class Model(BaseModel):
          name: Optional[str] = None
          address: Optional[Address] = None
    `;

    const configs = {
      forceOptional: "AllClasses"
    };

    await testWithTemporaryConfig(configs, () =>
      clipboardTest(input, expected)
    );
  });

  test('Should apply configured "aliasCamelCase" config', async () => {
    const input = dedent`
      {
        "userName": "Alice",
        "emailAddress": "alice@example.com"
      }
    `;

    const expected = dedent`
      from __future__ import annotations

      from pydantic import BaseModel, Field


      class Model(BaseModel):
          user_name: str = Field(..., alias='userName')
          email_address: str = Field(..., alias='emailAddress')
    `;

    const configs = {
      aliasCamelCase: true
    };

    await testWithTemporaryConfig(configs, () =>
      clipboardTest(input, expected)
    );
  });
});

suite("Error handling tests", () => {
  vscode.window.showInformationMessage("Start error handling tests.");

  test("Should show an error message when the input is invalid (generatePydanticCode error)", async () => {
    await errorTest(
      "[]",
      "Error: Input must be an object or an array of objects",
      "json-to-pydantic.generateFromClipboard"
    );
  });

  test("Should show an error message when the input is invalid (JSON parser error)", async () => {
    await errorTest(
      "test",
      "Error: The input string is not a valid JSON",
      "json-to-pydantic.generateFromClipboard"
    );
  });

  test("Should show an error message when the selection is empty", async () => {
    await errorTest(
      "",
      "Error: No selected text.",
      "json-to-pydantic.generateFromSelection"
    );
  });
});

