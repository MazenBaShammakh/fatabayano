import type { NextConfig } from "next";

const knowledgeData = ["./data/quran.json", "./data/hadeethenc.json"];

const nextConfig: NextConfig = {
  // The knowledge tools read these at runtime with fs, so make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/api/analyze": knowledgeData,
    "/api/claims/verify": knowledgeData,
  },
};

export default nextConfig;
