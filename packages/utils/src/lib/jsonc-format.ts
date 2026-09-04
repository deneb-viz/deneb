import {
    findNodeAtOffset,
    parseTree,
    visit,
    type Node,
    type ParseError
} from 'jsonc-parser';

/**
 * Options for the compact JSONC formatter.
 */
export interface JsoncCompactFormatOptions {
    /** Spaces per indent level. */
    tabSize: number;
    /**
     * A container (object/array) whose single-line form — including its
     * indent, key prefix and trailing comma — fits within this many characters
     * is written on one line. Anything longer is expanded one child per line.
     * Trailing comments are appended after the fit test and may extend a line
     * beyond this width.
     */
    maxLineLength: number;
}

/** A span of the source text, in character offsets. */
export interface JsoncRange {
    offset: number;
    length: number;
}

/** A replacement for a span of the source text. */
export interface JsoncTextEdit extends JsoncRange {
    content: string;
}

type JsoncComment = JsoncRange;

/**
 * Where every comment has been attached, keyed by AST node identity.
 *
 * - `leading`: emitted on their own line(s) immediately above the node.
 * - `trailing`: emitted at the end of the node's line (after its comma).
 * - `inner`: inside a container, after its last child, before the closer.
 * - `after`: after the root value, at the end of the document.
 */
interface CommentAttachments {
    leading: Map<Node, JsoncComment[]>;
    trailing: Map<Node, JsoncComment[]>;
    inner: Map<Node, JsoncComment[]>;
    after: JsoncComment[];
}

interface RenderContext {
    content: string;
    root: Node;
    comments: CommentAttachments;
    options: JsoncCompactFormatOptions;
}

const isContainer = (node: Node) =>
    node.type === 'object' || node.type === 'array';

const nodeEnd = (span: JsoncRange) => span.offset + span.length;

const contains = (node: Node, offset: number) =>
    node.offset <= offset && offset < nodeEnd(node);

const raw = (ctx: RenderContext, span: JsoncRange) =>
    ctx.content.slice(span.offset, nodeEnd(span));

const indentFor = (ctx: RenderContext, depth: number) =>
    ' '.repeat(depth * ctx.options.tabSize);

const bracketsFor = (node: Node): [string, string] =>
    node.type === 'object' ? ['{', '}'] : ['[', ']'];

/**
 * Only horizontal whitespace and at most one comma may sit between the end of
 * a node and a comment for that comment to count as trailing the node.
 */
const TRAILING_GAP = /^[ \t]*,?[ \t]*$/;

const pushTo = (
    map: Map<Node, JsoncComment[]>,
    node: Node,
    comment: JsoncComment
) => map.set(node, [...(map.get(node) ?? []), comment]);

const collectComments = (content: string): JsoncComment[] => {
    const comments: JsoncComment[] = [];
    visit(content, {
        onComment: (offset, length) => {
            comments.push({ offset, length });
        }
    });
    return comments;
};

/**
 * Deepest object/array whose span contains `offset`, or `undefined` when the
 * offset lies outside the root value. Property nodes are passed through: an
 * offset between a key and its value resolves to the enclosing object.
 */
const findEnclosingContainer = (
    root: Node,
    offset: number
): Node | undefined => {
    let enclosing: Node | undefined;
    let node: Node | undefined = root;
    while (node && contains(node, offset)) {
        if (isContainer(node)) {
            enclosing = node;
        }
        node = node.children?.find((child) => contains(child, offset));
    }
    return enclosing;
};

/**
 * Attach every comment to a node. Candidates are the children of the
 * container the comment sits in (property nodes for objects, element nodes for
 * arrays), or the root when the comment is outside it.
 */
const attachComments = (content: string, root: Node): CommentAttachments => {
    const attachments: CommentAttachments = {
        leading: new Map(),
        trailing: new Map(),
        inner: new Map(),
        after: []
    };
    for (const comment of collectComments(content)) {
        const enclosing = findEnclosingContainer(root, comment.offset);
        const candidates = enclosing ? (enclosing.children ?? []) : [root];
        const previous = candidates
            .filter((candidate) => nodeEnd(candidate) <= comment.offset)
            .pop();
        const next = candidates.find(
            (candidate) => candidate.offset >= nodeEnd(comment)
        );
        const gapBefore = previous
            ? content.slice(nodeEnd(previous), comment.offset)
            : null;
        if (previous && gapBefore !== null && TRAILING_GAP.test(gapBefore)) {
            pushTo(attachments.trailing, previous, comment);
        } else if (next) {
            pushTo(attachments.leading, next, comment);
        } else if (enclosing) {
            pushTo(attachments.inner, enclosing, comment);
        } else {
            attachments.after.push(comment);
        }
    }
    return attachments;
};

const parseDocument = (
    content: string,
    options: JsoncCompactFormatOptions
): RenderContext | undefined => {
    const errors: ParseError[] = [];
    const root = parseTree(content, errors);
    if (!root || errors.length > 0) {
        return undefined;
    }
    return {
        content,
        root,
        comments: attachComments(content, root),
        options
    };
};

/**
 * Whether any comment is attached inside `node` (its inner comments, or any
 * descendant's leading/trailing comments). The node's own leading/trailing
 * comments do not count — they are emitted by its parent and do not prevent
 * the node itself from being written on one line.
 */
const subtreeHasComments = (ctx: RenderContext, node: Node): boolean =>
    ctx.comments.inner.has(node) ||
    (node.children ?? []).some(
        (child) =>
            ctx.comments.leading.has(child) ||
            ctx.comments.trailing.has(child) ||
            subtreeHasComments(ctx, child)
    );

/**
 * Single-line rendering of `node`, or `null` when a comment anywhere inside it
 * rules that out. Spacing matches json-stringify-pretty-compact: a space after
 * `:` and `,`, none inside the brackets.
 */
const renderFlat = (ctx: RenderContext, node: Node): string | null => {
    if (node.type === 'property') {
        const key = node.children?.[0];
        const value = node.children?.[1];
        if (!key || !value) {
            return raw(ctx, node);
        }
        const flatValue = renderFlat(ctx, value);
        return flatValue === null ? null : `${raw(ctx, key)}: ${flatValue}`;
    }
    if (!isContainer(node)) {
        return raw(ctx, node);
    }
    if (subtreeHasComments(ctx, node)) {
        return null;
    }
    const parts: string[] = [];
    for (const child of node.children ?? []) {
        const part = renderFlat(ctx, child);
        if (part === null) {
            return null;
        }
        parts.push(part);
    }
    const [open, close] = bracketsFor(node);
    return `${open}${parts.join(', ')}${close}`;
};

/**
 * Multi-line block comments have their continuation lines trimmed and
 * re-aligned three columns in from the current indent (under the text that
 * follows the opening block-comment marker). Single-line comments are emitted
 * verbatim.
 */
const renderComment = (
    ctx: RenderContext,
    comment: JsoncComment,
    depth: number
) => {
    const text = raw(ctx, comment);
    const lines = text.split(/\r?\n/);
    if (lines.length === 1) {
        return text;
    }
    const continuation = `${indentFor(ctx, depth)}   `;
    return [
        lines[0],
        ...lines.slice(1).map((line) => `${continuation}${line.trim()}`)
    ].join('\n');
};

const trailingSuffix = (ctx: RenderContext, node: Node, depth: number) =>
    (ctx.comments.trailing.get(node) ?? [])
        .map((comment) => ` ${renderComment(ctx, comment, depth)}`)
        .join('');

/**
 * Render `node` at structural `depth`. The first line is returned without
 * indent (the caller positions it); continuation lines carry absolute indent.
 * `reserved` is the width already committed on the first line — the `"key": `
 * prefix and the trailing comma — mirroring json-stringify-pretty-compact's
 * fit test.
 */
const renderNode = (
    ctx: RenderContext,
    node: Node,
    depth: number,
    reserved: number
): string => {
    if (node.type === 'property') {
        const key = node.children?.[0];
        const value = node.children?.[1];
        if (!key || !value) {
            return raw(ctx, node);
        }
        const keyPrefix = `${raw(ctx, key)}: `;
        return `${keyPrefix}${renderNode(
            ctx,
            value,
            depth,
            reserved + keyPrefix.length
        )}`;
    }
    if (!isContainer(node)) {
        return raw(ctx, node);
    }
    const flat = renderFlat(ctx, node);
    const indentWidth = depth * ctx.options.tabSize;
    if (
        flat !== null &&
        indentWidth + reserved + flat.length <= ctx.options.maxLineLength
    ) {
        return flat;
    }
    const [open, close] = bracketsFor(node);
    const children = node.children ?? [];
    const inner = ctx.comments.inner.get(node) ?? [];
    if (children.length === 0 && inner.length === 0) {
        return `${open}${close}`;
    }
    const childDepth = depth + 1;
    const childIndent = indentFor(ctx, childDepth);
    const lines: string[] = [open];
    children.forEach((child, index) => {
        const isLast = index === children.length - 1;
        for (const comment of ctx.comments.leading.get(child) ?? []) {
            lines.push(
                `${childIndent}${renderComment(ctx, comment, childDepth)}`
            );
        }
        const rendered = renderNode(ctx, child, childDepth, isLast ? 0 : 1);
        lines.push(
            `${childIndent}${rendered}${isLast ? '' : ','}${trailingSuffix(
                ctx,
                child,
                childDepth
            )}`
        );
    });
    for (const comment of inner) {
        lines.push(`${childIndent}${renderComment(ctx, comment, childDepth)}`);
    }
    lines.push(`${indentFor(ctx, depth)}${close}`);
    return lines.join('\n');
};

/**
 * Format a whole JSONC document compactly, preserving comments. Invalid JSON
 * (parse errors, trailing commas) is returned unchanged.
 */
export const formatJsoncCompact = (
    content: string,
    options: JsoncCompactFormatOptions
): string => {
    const ctx = parseDocument(content, options);
    if (!ctx) {
        return content;
    }
    const lines = (ctx.comments.leading.get(ctx.root) ?? []).map((comment) =>
        renderComment(ctx, comment, 0)
    );
    lines.push(
        `${renderNode(ctx, ctx.root, 0, 0)}${trailingSuffix(ctx, ctx.root, 0)}`
    );
    lines.push(
        ...ctx.comments.after.map((comment) => renderComment(ctx, comment, 0))
    );
    return lines.join('\n');
};

const ancestryOf = (node: Node): Node[] => {
    const chain: Node[] = [];
    for (
        let current: Node | undefined = node;
        current;
        current = current.parent
    ) {
        chain.unshift(current);
    }
    return chain;
};

const commonAncestor = (a: Node, b: Node): Node => {
    const chainA = ancestryOf(a);
    const chainB = ancestryOf(b);
    let common = chainA[0] ?? a;
    for (
        let i = 0;
        i < chainA.length && i < chainB.length && chainA[i] === chainB[i];
        i++
    ) {
        common = chainA[i] ?? common;
    }
    return common;
};

const countContainerAncestors = (node: Node) => {
    let depth = 0;
    for (let current = node.parent; current; current = current.parent) {
        if (isContainer(current)) {
            depth++;
        }
    }
    return depth;
};

/**
 * The smallest complete node containing the selection. A selection that lands
 * on a property's key or value snaps to the whole property; a selection in
 * whitespace outside the root snaps to the root.
 */
const findFormatTarget = (root: Node, range: JsoncRange): Node => {
    const start = findNodeAtOffset(root, range.offset) ?? root;
    const lastOffset =
        range.length > 0 ? range.offset + range.length - 1 : range.offset;
    const end = findNodeAtOffset(root, lastOffset) ?? root;
    const ancestor = commonAncestor(start, end);
    return ancestor.parent?.type === 'property' ? ancestor.parent : ancestor;
};

const isWithinSubtree = (node: Node, ancestor: Node): boolean => {
    for (
        let current: Node | undefined = node;
        current;
        current = current.parent
    ) {
        if (current === ancestor) {
            return true;
        }
    }
    return false;
};

const spanContainsComment = (span: JsoncRange, comment: JsoncComment) =>
    comment.offset >= span.offset && nodeEnd(comment) <= nodeEnd(span);

/**
 * Whether replacing `target`'s span with `renderNode(target)` would delete a
 * comment. A comment between a property's key and its value lies INSIDE the
 * property's source span but attaches to the NEXT sibling (or the enclosing
 * container when there is none) — outside the property's subtree — so the
 * replacement would swallow its bytes without re-rendering it anywhere.
 */
const rangeRenderDropsComments = (
    ctx: RenderContext,
    target: Node
): boolean => {
    const maps = [
        ctx.comments.leading,
        ctx.comments.trailing,
        ctx.comments.inner
    ];
    for (const map of maps) {
        for (const [node, comments] of map) {
            for (const comment of comments) {
                if (
                    spanContainsComment(target, comment) &&
                    !isWithinSubtree(node, target)
                ) {
                    return true;
                }
            }
        }
    }
    return false;
};

/**
 * Format only the smallest complete value or property that contains `range`.
 * Returns the single edit to apply, or `undefined` for invalid JSON. Comments
 * outside the target node's span are untouched. The target widens to an
 * ancestor when its own span contains a comment the rendered replacement
 * would not carry (see {@link rangeRenderDropsComments}) — at the root every
 * in-span comment is attached within the subtree, so widening terminates.
 */
export const formatJsoncCompactRange = (
    content: string,
    range: JsoncRange,
    options: JsoncCompactFormatOptions
): JsoncTextEdit | undefined => {
    const ctx = parseDocument(content, options);
    if (!ctx) {
        return undefined;
    }
    let target = findFormatTarget(ctx.root, range);
    while (target.parent && rangeRenderDropsComments(ctx, target)) {
        target = target.parent;
    }
    const siblings = target.parent?.children ?? [];
    const isLast =
        siblings.length === 0 || siblings[siblings.length - 1] === target;
    return {
        offset: target.offset,
        length: target.length,
        content: renderNode(
            ctx,
            target,
            countContainerAncestors(target),
            isLast ? 0 : 1
        )
    };
};
