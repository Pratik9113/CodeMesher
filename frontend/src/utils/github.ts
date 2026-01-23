import { Octokit } from "@octokit/rest"
import type { TreeNode } from "../types/display"

// Initialize Octokit (replace with your own GitHub PAT)
export const octokit = new Octokit({
    auth: import.meta.env.GITHUB_TOKEN
})

export const mapGitHubToTreeNode = (items: any[]): TreeNode[] => {
    return items.map((item) => ({
        name: item.name,
        path: item.path,
        isDir: item.type === 'dir',
        children: item.type === 'dir' ? [] : undefined,
    }))
}

export const fetchRepoContent = async (owner: string, repo: string, path = ''): Promise<TreeNode[]> => {
    try {
        const res = await octokit.rest.repos.getContent({ owner, repo, path })
        if (!Array.isArray(res.data)) return []
        return mapGitHubToTreeNode(res.data)
    } catch (err) {
        console.error(err)
        return []
    }
}
