import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";
import type { Octokit as OctokitCore } from "@octokit/core";

// Type for the Octokit instance returned by getInstallationOctokit
// At runtime, this is an instance of @octokit/rest's Octokit, but TypeScript
// infers it as @octokit/core's Octokit due to version mismatch between
// @octokit/app (v13) and @octokit/rest (v20). We use InstanceType to capture
// the actual runtime type we're using.
export type InstallationOctokit = InstanceType<typeof Octokit>;

const app = new App({
  appId: Number(process.env.GITHUB_APP_ID),
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!
  },
  // Type assertion required due to version mismatch between @octokit/app (v13) and
  // @octokit/rest (v20). At runtime, @octokit/rest's Octokit is compatible with
  // what @octokit/app expects (it extends @octokit/core's Octokit), but TypeScript
  // cannot verify this due to different @octokit/core versions in their dependency trees.
  // The intermediate 'as unknown' is required by TypeScript when types don't overlap,
  // but this is safer than 'as any' because:
  // 1. We explicitly target typeof OctokitCore (the expected type)
  // 2. @octokit/rest's Octokit extends @octokit/core's Octokit at runtime
  // 3. The constructor signature is compatible
  // 4. Runtime behavior is verified through tests
  Octokit: Octokit as unknown as typeof OctokitCore,
});

export async function getInstallationOctokit(
  installationId: number
): Promise<InstallationOctokit> {
  // Type assertion needed: TypeScript infers @octokit/core's Octokit, but runtime
  // returns @octokit/rest's Octokit (which we passed as the constructor above).
  // The intermediate 'as unknown' is required by TypeScript, but this is safer than
  // the original 'as unknown as Promise<Octokit>' because:
  // 1. We await first, so we're asserting the instance type, not Promise type
  // 2. We use InstallationOctokit (InstanceType<typeof Octokit>) which accurately
  //    represents the runtime type
  // 3. Safe because we control the Octokit constructor passed to App
  const result = await app.getInstallationOctokit(installationId);
  return result as unknown as InstallationOctokit;
}

export async function readFile(
  octokit: InstallationOctokit,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repo format: "${repo}". Expected 'owner/name'.`);
  }
  const [owner, name] = parts;
  const res = await octokit.repos.getContent({ owner, repo: name, path, ref });
  if (!("content" in res.data)) {
    throw new Error("not a file");
  }
  return Buffer.from(
    res.data.content,
    res.data.encoding as BufferEncoding
  ).toString("utf8");
}
