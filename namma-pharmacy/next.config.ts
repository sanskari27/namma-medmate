import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "@aws-sdk/client-cognito-identity-provider", "@aws-sdk/client-s3"],
};

export default nextConfig;
