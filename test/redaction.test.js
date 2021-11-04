const fs = require("fs");
const path = require("path");
const remark = require("remark");
const tape = require("tape");

const { redact } = require("..");

fs.readdirSync(path.resolve(__dirname, "data")).forEach(testCategory => {
  const dataPath = path.resolve(__dirname, "data", testCategory);

  const plugin = require(path.resolve(dataPath, "plugin.js"));
  const redactedText = fs.readFileSync(
    path.resolve(dataPath, "redacted.md"),
    "utf-8"
  );
  const redactedTree = require(path.resolve(dataPath, "redacted.json"));
  const sourceText = fs.readFileSync(path.join(dataPath, "source.md"), "utf-8");

  tape(testCategory, test => {
    test.plan(3);

    // string to ast
    test.test("content can be redacted to Redaction nodes", subtest => {
      subtest.plan(1);
      const indexAgnosticTree = remark()
        .use(redact)
        .use(plugin)
        .parse(sourceText);
      subtest.deepEqual(
        remark()
          .use(redact)
          .runSync(indexAgnosticTree),
        redactedTree
      );
    });

    // ast to string
    test.test("Redaction nodes can render to string", subtest => {
      subtest.plan(1);
      subtest.equal(
        remark()
          .use(redact)
          .stringify(redactedTree),
        redactedText
      );
    });

    // string to string
    test.test("content can redact to string", subtest => {
      subtest.plan(1);
      subtest.equal(
        remark()
          .use(redact)
          .use(plugin)
          .processSync(sourceText).contents,
        redactedText
      );
    });
  });
});
