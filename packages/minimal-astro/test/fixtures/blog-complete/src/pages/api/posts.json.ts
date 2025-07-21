// API route for blog posts
// This demonstrates server-side API generation

export async function GET() {
  // Simulate content collection query
  const posts = [
    {
      id: 'first-post',
      title: 'Getting Started with Minimal Astro',
      description:
        'Learn how to build fast, modern websites with our lightweight Astro implementation.',
      publishDate: '2024-01-15',
      author: 'John Doe',
      tags: ['astro', 'web-development', 'javascript', 'getting-started'],
      draft: false,
      featured: true,
    },
    {
      id: 'second-post',
      title: 'Advanced Patterns in Minimal Astro',
      description:
        'Explore advanced techniques for building complex applications with our Astro implementation.',
      publishDate: '2024-02-01',
      author: 'Jane Smith',
      tags: ['astro', 'advanced', 'patterns', 'architecture'],
      draft: false,
      featured: false,
    },
    {
      id: 'draft-post',
      title: 'This is a Draft Post',
      description: 'This post is still in draft mode and should not appear in production builds.',
      publishDate: '2024-03-01',
      author: 'John Doe',
      tags: ['draft', 'work-in-progress'],
      draft: true,
      featured: false,
    },
  ];

  // Filter out drafts for production API
  const publishedPosts = posts.filter((post) => !post.draft);

  return new Response(
    JSON.stringify({
      posts: publishedPosts,
      meta: {
        total: publishedPosts.length,
        featured: publishedPosts.filter((p) => p.featured).length,
        authors: [...new Set(publishedPosts.map((p) => p.author))],
        tags: [...new Set(publishedPosts.flatMap((p) => p.tags))],
        generatedAt: new Date().toISOString(),
      },
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    }
  );
}
