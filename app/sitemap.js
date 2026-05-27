export default async function sitemap() {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return [
      { url: baseUrl, changeFrequency: 'daily', priority: 1 },
      { url: `${baseUrl}/login`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/register`, changeFrequency: 'monthly', priority: 0.5 },
      { url: `${baseUrl}/teacher`, changeFrequency: 'weekly', priority: 0.8 },
      { url: `${baseUrl}/student`, changeFrequency: 'weekly', priority: 0.8 },
    ];
  }