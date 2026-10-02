import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const links = z.array(z.object({ label: z.string(), url: z.string() })).default([]);

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    summary: z.string().optional(),
    year: z.number(),
    venue: z.string().optional(),
    authors: z.string().optional(),
    links,
    // Breaks ties within a year: higher comes first.
    order: z.number().default(0),
    // A standalone page (e.g. an explainer) the entry links to directly;
    // such an entry gets no page of its own.
    page: z.string().optional(),
    // 'publication' for work accepted at a venue, 'note' for other write-ups.
    kind: z.enum(['publication', 'note']).default('publication'),
    draft: z.boolean().default(false),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    year: z.number(),
    stack: z.array(z.string()).default([]),
    status: z.enum(['active', 'finished']).default('finished'),
    links,
    draft: z.boolean().default(false),
  }),
});

export const collections = { research, projects };
