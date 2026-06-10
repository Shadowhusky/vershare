import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://vershare.uk",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://vershare.uk/doc",
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
