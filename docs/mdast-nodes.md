# New mdast nodes

This project adds several new [**mdast**](https://github.com/syntax-tree/mdast)
nodes, documented here.

## Table of Contents

* [Nodes](#nodes)
  * [InlineRedaction](#inline-redaction)
  * [BlockRedaction](#block-redaction)
* [Mixins](#mixins)
  * [Redaction](#redaction)

## Nodes

### `Inline Redaction`

```idl
interface InlineRedaction <: Node {
  type: "inlineRedaction"
}

InlineRedaction includes Redaction
```

**InlineRedaction** ([**Node**](https://github.com/syntax-tree/unist#node))
represents an inline node which has been [**redacted**](#redaction) from the
original document.

### `Block Redaction`

```idl
interface BlockRedaction <: Parent {
  type: "blockRedaction",
  children: [PhrasingContent]
}

BlockRedaction includes Redaction
```

**BlockRedaction** ([**Parent**](https://github.com/syntax-tree/mdast#parent))
represents a block node which has been [**redacted**](#redaction) from the
original document.

The original node's children may be redacted as well, or they may be preserved
in the **BlockRedaction** node.

## Mixins

### `Redaction`

```idl
interface mixin Redaction {
  redactionContent: [StaticPhrasingContent]?,
  redactionData: object?,
  redactionType: string
}
```

**Redaction** represents a node which has replaced ("redacted") another node.

A `redactionType` field must be present.
It represents the `type` value of the node it is replacing, and should match
that value exactly.

A `redactionContent` field can optionally be present.
It represents the content that will be rendered.

A `redactionData` field can optionally be present.
It represents all data necessary for the original node to be reconstructed.
