import { Node } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    openapi: {
      setOpenApi: (attributes?: { spec?: string }) => ReturnType;
    };
  }
}

/** Keep the original document in page content for history, collaboration and export. */
export const OpenApi = Node.create({
  name: 'openapi',
  group: 'block',
  atom: true,
  isolating: true,
  draggable: true,

  addAttributes() {
    return {
      spec: {
        default: '',
        rendered: false,
        parseHTML: (element) =>
          element.querySelector('code')?.textContent ?? '',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="openapi"]' }];
  },

  renderHTML({ node }) {
    return [
      'div',
      { 'data-type': 'openapi' },
      [
        'pre',
        {},
        ['code', { class: 'language-openapi' }, String(node.attrs.spec ?? '')],
      ],
    ];
  },

  renderText({ node }) {
    return String(node.attrs.spec ?? '');
  },

  addCommands() {
    return {
      setOpenApi:
        (attributes = {}) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: attributes }),
    };
  },
});
