import {
  htmlToJson,
  jsonToHtml,
  jsonToNode,
  jsonToText,
} from './collaboration.util';

describe('OpenAPI page serialization', () => {
  const source =
    'openapi: 3.1.0\ninfo:\n  title: "<script>alert(1)</script>"\n  version: "1.0"\npaths: {}';
  const doc = {
    type: 'doc',
    content: [{ type: 'openapi', attrs: { spec: source } }],
  };

  it('keeps the specification in the collaboration schema and searchable text', () => {
    const node = jsonToNode(doc);
    expect(node.firstChild.type.name).toBe('openapi');
    expect(node.firstChild.attrs.spec).toBe(source);
    expect(jsonToText(doc)).toContain('openapi: 3.1.0');
  });

  it('round-trips through server HTML conversion as escaped source', () => {
    const html = jsonToHtml(doc);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(htmlToJson(html).content[0]).toEqual(jsonToNode(doc).toJSON().content[0]);
  });
});
