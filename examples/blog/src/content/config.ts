// @ts-ignore
import { defineCollection, z } from 'minimal-astro/content';

const postCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    author: z.string(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().default(false),
  }),
});

const authorsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    bio: z.string(),
    avatar: z.string().optional(),
    social: z
      .object({
        twitter: z.string().optional(),
        github: z.string().optional(),
        website: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  post: postCollection,
  authors: authorsCollection,
};
