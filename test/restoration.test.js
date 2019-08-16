const fs = require("fs");
const path = require("path");
const remark = require("remark");
const tape = require("tape");

const { restore } = require("..");

fs.readdirSync(path.resolve(__dirname, "data")).forEach(testCategory => {
  const dataPath = path.resolve(__dirname, "data", testCategory);

  const plugin = require(path.resolve(dataPath, "plugin.js"));
  const redactedTree = require(path.resolve(dataPath, "redacted.json"));
  const restoredText = fs.readFileSync(
    path.join(dataPath, "restored.md"),
    "utf-8"
  );
  const restoredTree = require(path.resolve(dataPath, "restored.json"));
  const translatedText = fs.readFileSync(
    path.resolve(dataPath, "translated.md"),
    "utf-8"
  );

  tape(testCategory, test => {
    test.plan(2);

    // source and redacted to ast
    test.test(
      "source tree and redacted content can be restored to an AST",
      subtest => {
        subtest.plan(1);
        subtest.deepEqual(
          remark()
            .use(restore(redactedTree))
            .use(plugin)
            .parse(translatedText),
          restoredTree
        );
      }
    );

    // source and redacted to string
    test.test(
      "source tree and redacted content can be restored to a string",
      subtest => {
        subtest.plan(1);
        subtest.equal(
          remark()
            .use(restore(redactedTree))
            .use(plugin)
            .processSync(translatedText).contents,
          restoredText
        );
      }
    );
  });
});
