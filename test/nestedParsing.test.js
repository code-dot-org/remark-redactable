const fs = require("fs");
const path = require("path");
const remark = require("remark");
const test = require("tape");

const {parseRestorations} = require("..");

const dataPath = path.resolve(__dirname, "nested");

test("nested nodes can be correctly parsed to Restoration nodes", function (test) {
    test.test("singly nested node", function (subtest) {
        const singleNestingTree = require(
            path.resolve(dataPath, "singleNestingTree.json")
        );
        const singleNestingText = fs.readFileSync(
            path.resolve(dataPath, "singleNestingText.md"),
            "utf-8"
        );
        subtest.deepEqual(remark()
                .use(parseRestorations)
                .parse(singleNestingText),
            singleNestingTree);
        subtest.end();
    });

    test.test("doubly nested node", function (subtest) {
        const doubleNestingTree = require(
            path.resolve(dataPath, "doubleNestingTree.json")
        );
        const doubleNestingText = fs.readFileSync(
            path.resolve(dataPath, "doubleNestingText.md"),
            "utf-8"
        );
        subtest.deepEqual(remark()
                .use(parseRestorations)
                .parse(doubleNestingText),
            doubleNestingTree);
        subtest.end();
    });

    test.test("multiple singly nested nodes", function (subtest) {
        const multipleSingleNestingTree = require(
            path.resolve(dataPath, "multipleSingleNestingTree.json")
        );
        const multipleSingleNestingText = fs.readFileSync(
            path.resolve(dataPath, "multipleSingleNestingText.md"),
            "utf-8"
        );
        subtest.deepEqual(remark()
                .use(parseRestorations)
                .parse(multipleSingleNestingText),
            multipleSingleNestingTree);
        subtest.end();
    });
});
