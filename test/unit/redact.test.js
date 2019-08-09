const remark = require('remark')
const tape = require('tape');

const redact = require('../../src/redact');
const restore = require('../../src/restore');
const { link } = require('@code-dot-org/remark-plugins');

const sourceText = "A [black](http://example.com/black) [cat](http://example.com/cat)\n";

tape('redaction with no plugins is a no-op', (test) => {
  test.plan(1);

  const redactedText = remark()
    .use(redact)
    .processSync(sourceText).contents;

  test.equal(redactedText, sourceText);
});

tape('redaction', (test) => {
  test.plan(1);

  const redactedText = remark()
    .use(redact)
    .use(link)
    .processSync(sourceText).contents;

  test.equal(redactedText, "A [black][0] [cat][1]\n");
});

tape('restoration', (test) => {
  test.plan(1);

  const redactedSourceTree = remark()
    .use(redact)
    .use(link)
    .parse(sourceText);

  const translatedText = "Une [chat][1] [noir][0]\n";

  const restoredText = remark()
    .use(restore(redactedSourceTree))
    .use(link)
    .processSync(translatedText).contents;

  test.equal(restoredText, "Une [chat](http://example.com/cat) [noir](http://example.com/black)\n");
});
