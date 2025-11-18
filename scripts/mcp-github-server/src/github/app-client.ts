import { App } from "@octokit/app";
import { Octokit } from "@octokit/rest";

const app = new App({
  appId: Number(process.env.GITHUB_APP_ID),
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  oauth: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!
  },
  Octokit: Octokit as any,
});

export async function getInstallationOctokit(
  installationId: number
): Promise<Octokit> {
  return app.getInstallationOctokit(installationId) as unknown as Promise<Octokit>;
}

export async function readFile(
  octokit: Octokit,
  repo: string,
  path: string,
  ref: string
): Promise<string> {
  const [owner, name] = repo.split("/");
  const res = await octokit.repos.getContent({ owner, repo: name, path, ref });
  if (!("content" in res.data)) {
    throw new Error("not a file");
  }
  return Buffer.from(
    res.data.content,
    res.data.encoding as BufferEncoding
  ).toString("utf8");
}
