const fs = require("fs");
const path = require("path");
const remark = require("remark");
const test = require("tape");

const {parseRestorations} = require("..");

const dataPath = path.resolve(__dirname, "malformed");

test("malformed redaction strings do not parse", function (test) {
    test.test("character separated brackets", function(subtest) {
        const separatedBrackets = fs.readFileSync(
            path.join(dataPath, "separatedBrackets.md"),
            "utf-8"
        );

        subtest.equal(remark()
            .use(parseRestorations)
            .processSync(separatedBrackets)
            .contents,
        separatedBrackets);
        subtest.end();
    });
});
