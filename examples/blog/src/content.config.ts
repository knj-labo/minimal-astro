// Note: In a real implementation, this would import from the minimal-astro package
// For now, using a simple schema definition without external dependencies

// Define collection schemas
const blog = {
  type: 'content' as const,
  schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' as const },
      description: { type: 'string' as const },
      publishDate: { type: 'date' as const },
      author: { type: 'string' as const },
      tags: {
        type: 'array' as const,
        items: { type: 'string' as const },
      },
      draft: { type: 'boolean' as const },
    },
    required: ['title', 'description', 'publishDate', 'author'],
  },
  patterns: ['*.md', '*.mdx'],
};

const authors = {
  type: 'data' as const,
  schema: {
    type: 'object' as const,
    properties: {
      name: { type: 'string' as const },
      bio: { type: 'string' as const },
      avatar: { type: 'string' as const },
      social: {
        type: 'object' as const,
        properties: {
          twitter: { type: 'string' as const },
          github: { type: 'string' as const },
          website: { type: 'string' as const },
        },
      },
    },
    required: ['name', 'bio'],
  },
  patterns: ['*.json', '*.yaml'],
};

export const collections = {
  blog,
  authors,
};
