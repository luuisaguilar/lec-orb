import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/api/', '/auth/', '/join/', '/portal/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_APP_URL || 'https://lec-orb.vercel.app'}/sitemap.xml`,
  };
}
